import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ConfigPermission,
  ConfigRole,
  ConfigUser,
  RoleConfigurationResponse,
  RoleConfigurationService,
} from '../../core/services/role-configuration.service';

@Component({
  selector: 'app-configuration-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './configuration-page.component.html',
  styleUrl: './configuration-page.component.scss',
})
export class ConfigurationPageComponent implements OnInit {
  activeTab: 'users-permissions' | 'access-configuration' = 'users-permissions';
  loading = false;
  savingPermissions = false;
  savingUserAccess = false;
  removingAccess = false;
  creatingRole = false;
  bootstrappingModules = false;
  errorMessage = '';
  successMessage = '';

  managedTenantId: number | null = null;
  permissions: ConfigPermission[] = [];
  roles: ConfigRole[] = [];
  users: ConfigUser[] = [];

  selectedAccessRoleId: number | null = null;
  selectedPermissionIds = new Set<number>();
  selectedUserId: number | null = null;
  selectedUserRoleIds = new Set<number>();
  accessModalOpen = false;
  readonly actionFilters = ['read', 'create', 'update', 'delete', 'manage'];

  roleForm = {
    role: '',
    description: '',
  };

  constructor(
    private readonly configService: RoleConfigurationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const tab = data['tab'] as 'users-permissions' | 'access-configuration' | undefined;
      this.activeTab = tab ?? 'users-permissions';
    });
    this.loadConfiguration();
  }

  get selectedRole(): ConfigRole | undefined {
    return this.roles.find((role) => role.id === this.selectedAccessRoleId);
  }

  get selectedUser(): ConfigUser | undefined {
    return this.users.find((user) => user.id === this.selectedUserId);
  }

  get tenantRoles(): ConfigRole[] {
    return this.roles.filter((role) => role.tenantId === this.managedTenantId);
  }

  get assignableRoles(): ConfigRole[] {
    return this.roles.filter(
      (role) => role.tenantId === null || role.tenantId === this.managedTenantId,
    );
  }

  get userSelectableModules(): ConfigRole[] {
    const systemRoles = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE']);
    return this.assignableRoles.filter((role) => !systemRoles.has(role.name));
  }

  get selectedRoleEditable(): boolean {
    return this.selectedRole?.tenantId === this.managedTenantId;
  }

  get permissionsByModule(): Array<{ module: string; rows: ConfigPermission[] }> {
    const grouped = new Map<string, ConfigPermission[]>();
    for (const permission of this.permissions) {
      const key = permission.module;
      grouped.set(key, [...(grouped.get(key) ?? []), permission]);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([module, rows]) => ({
        module,
        rows: rows.sort((a, b) => a.permission.localeCompare(b.permission)),
      }));
  }

  loadConfiguration(): void {
    this.loading = true;
    this.errorMessage = '';

    this.configService.getConfiguration().subscribe({
      next: (res: RoleConfigurationResponse) => {
        this.managedTenantId = res.managedTenantId;
        this.permissions = res.permissions;
        this.roles = res.roles;
        this.users = res.users;

        if (
          !this.selectedAccessRoleId ||
          !this.roles.some((role) => role.id === this.selectedAccessRoleId)
        ) {
          this.selectedAccessRoleId = this.tenantRoles[0]?.id ?? null;
        }

        if (!this.selectedUserId || !this.users.some((user) => user.id === this.selectedUserId)) {
          this.selectedUserId = this.users[0]?.id ?? null;
        }

        this.syncSelectedPermissions();
        this.syncSelectedUserAccess();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load configuration data.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  selectRole(roleId: number): void {
    this.selectedAccessRoleId = roleId;
    this.successMessage = '';
    this.errorMessage = '';
    this.syncSelectedPermissions();
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
    this.successMessage = '';
    this.errorMessage = '';
    this.syncSelectedUserAccess();
  }

  onUserSelectedForAccess(userId: number | null): void {
    if (!userId) {
      this.selectedUserId = null;
      this.selectedUserRoleIds = new Set<number>();
      this.accessModalOpen = false;
      return;
    }

    this.selectUser(userId);
    this.accessModalOpen = true;
  }

  openAccessModal(userId: number): void {
    this.selectUser(userId);
    this.accessModalOpen = true;
  }

  closeAccessModal(): void {
    this.accessModalOpen = false;
  }

  switchTab(tab: 'users-permissions' | 'access-configuration'): void {
    const path =
      tab === 'access-configuration'
        ? '/configuration/access-configuration'
        : '/configuration/users-permissions';
    this.router.navigateByUrl(path);
    this.successMessage = '';
    this.errorMessage = '';
  }

  togglePermission(permissionId: number, checked: boolean): void {
    if (checked) {
      this.selectedPermissionIds.add(permissionId);
      return;
    }

    this.selectedPermissionIds.delete(permissionId);
  }

  toggleActionPermissions(action: string, checked: boolean): void {
    const targets = this.permissions.filter((permission) =>
      permission.permission.toLowerCase().includes(action.toLowerCase()),
    );

    for (const permission of targets) {
      if (checked) {
        this.selectedPermissionIds.add(permission.id);
      } else {
        this.selectedPermissionIds.delete(permission.id);
      }
    }
  }

  isActionFullySelected(action: string): boolean {
    const targets = this.permissions.filter((permission) =>
      permission.permission.toLowerCase().includes(action.toLowerCase()),
    );

    if (!targets.length) {
      return false;
    }

    return targets.every((permission) => this.selectedPermissionIds.has(permission.id));
  }

  actionLabel(action: string): string {
    return `${action.charAt(0).toUpperCase()}${action.slice(1)} access`;
  }

  toggleUserRole(roleId: number, checked: boolean): void {
    if (checked) {
      this.selectedUserRoleIds.add(roleId);
      return;
    }

    this.selectedUserRoleIds.delete(roleId);
  }

  canManageRole(roleId: number): boolean {
    return this.userSelectableModules.some((role) => role.id === roleId);
  }

  createRole(): void {
    if (!this.roleForm.role.trim()) {
      this.errorMessage = 'Role name is required.';
      return;
    }

    this.creatingRole = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.configService
      .createTenantRole({
        role: this.roleForm.role.trim(),
        description: this.roleForm.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.roleForm = { role: '', description: '' };
          this.successMessage = 'Tenant role created successfully.';
          this.loadConfiguration();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create tenant role.';
        },
        complete: () => {
          this.creatingRole = false;
        },
      });
  }

  savePermissions(): void {
    if (!this.selectedAccessRoleId) {
      this.errorMessage = 'Select a role to configure permissions.';
      return;
    }

    if (!this.selectedRoleEditable) {
      this.errorMessage = 'You can edit permissions only for tenant roles.';
      return;
    }

    this.savingPermissions = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.configService
      .setRolePermissions(this.selectedAccessRoleId, Array.from(this.selectedPermissionIds))
      .subscribe({
        next: () => {
          this.successMessage = 'Role permissions updated successfully.';
          this.loadConfiguration();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update role permissions.';
        },
        complete: () => {
          this.savingPermissions = false;
        },
      });
  }

  saveUserAccess(): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'Select a user before saving access.';
      return;
    }

    const manageableRoleIds = new Set(this.userSelectableModules.map((role) => role.id));
    const currentRoleIds = new Set(
      (this.selectedUser?.roles ?? [])
        .map((row) => row.role.id)
        .filter((roleId) => manageableRoleIds.has(roleId)),
    );

    const targetRoleIds = Array.from(this.selectedUserRoleIds);
    const toAssign = targetRoleIds.filter((roleId) => !currentRoleIds.has(roleId));
    const toUnassign = Array.from(currentRoleIds).filter((roleId) => !this.selectedUserRoleIds.has(roleId));

    if (!toAssign.length && !toUnassign.length) {
      this.successMessage = 'No access changes to save.';
      return;
    }

    this.savingUserAccess = true;
    this.errorMessage = '';
    this.successMessage = '';

    const operations = [
      ...toAssign.map((roleId) =>
        this.configService.assignScopedRole({
          userId: this.selectedUserId!,
          roleId,
        }),
      ),
      ...toUnassign.map((roleId) =>
        this.configService.unassignScopedRole({
          userId: this.selectedUserId!,
          roleId,
        }),
      ),
    ];

    forkJoin(operations).subscribe({
      next: () => {
        this.successMessage = 'User access updated successfully.';
        this.accessModalOpen = false;
        this.loadConfiguration();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update user access.';
      },
      complete: () => {
        this.savingUserAccess = false;
      },
    });
  }

  removeSingleUserAccess(userId: number, roleId: number): void {
    this.removingAccess = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.configService.unassignScopedRole({ userId, roleId }).subscribe({
      next: () => {
        this.successMessage = 'User module access removed.';
        this.loadConfiguration();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to remove user module access.';
      },
      complete: () => {
        this.removingAccess = false;
      },
    });
  }

  clearSelectedModulePermissions(): void {
    if (!this.selectedAccessRoleId) {
      this.errorMessage = 'Select a module first.';
      return;
    }

    this.selectedPermissionIds = new Set<number>();
    this.savePermissions();
  }

  generateDefaultModules(): void {
    this.bootstrappingModules = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.configService.bootstrapTenantModuleRoles().subscribe({
      next: () => {
        this.successMessage = 'Default module roles created. You can now tick module access for users.';
        this.loadConfiguration();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to generate default modules.';
      },
      complete: () => {
        this.bootstrappingModules = false;
      },
    });
  }

  private syncSelectedPermissions(): void {
    const role = this.selectedRole;
    this.selectedPermissionIds = new Set(
      (role?.rolePermissions ?? []).map((row) => row.permissionId),
    );
  }

  private syncSelectedUserAccess(): void {
    const user = this.selectedUser;
    const manageableRoleIds = new Set(this.userSelectableModules.map((role) => role.id));
    this.selectedUserRoleIds = new Set(
      (user?.roles ?? [])
        .map((row) => row.role.id)
        .filter((roleId) => manageableRoleIds.has(roleId)),
    );
  }
}
