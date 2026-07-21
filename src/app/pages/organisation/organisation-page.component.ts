import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrganisationService } from '../../core/services/organisation.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';

type DeleteTarget = { type: 'location' | 'department' | 'team'; item: any };

@Component({
  selector: 'app-organisation-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ConfirmDialogComponent, EditDialogShellComponent],
  templateUrl: './organisation-page.component.html',
  styleUrl: './organisation-page.component.scss',
})
export class OrganisationPageComponent implements OnInit {
  tree: any[] = [];
  locations: any[] = [];
  departments: any[] = [];
  teams: any[] = [];
  employees: any[] = [];
  employeeOptions: Array<{ id: number; label: string }> = [];

  // Expanded rows in the Departments/Teams/Locations tabs (reveals members inline).
  expandedDepartments = new Set<number>();
  expandedTeams = new Set<number>();
  expandedLocations = new Set<number>();

  isCompanyAdmin = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  activeTab: 'tree' | 'locations' | 'departments' | 'teams' = 'tree';
  mutatingId: number | null = null;

  showLocationForm = false;
  locationForm = { name: '', address: '' };

  showDepartmentForm = false;
  departmentForm = { name: '', locationId: 0, managerId: 0 };

  showTeamForm = false;
  teamForm = { name: '', departmentId: 0 };

  editingLocation: any | null = null;
  editingDepartment: any | null = null;
  editingTeam: any | null = null;
  editBusy = false;

  locationEditForm = { name: '', address: '' };
  departmentEditForm = { name: '', locationId: 0, managerId: 0 };
  teamEditForm = { name: '', departmentId: 0 };

  deleteTarget: DeleteTarget | null = null;
  confirmBusy = false;

  constructor(
    private readonly orgService: OrganisationService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.isCompanyAdmin = this.auth.user()?.roles.includes('COMPANY_ADMIN') ?? false;
    this.applyRouteParams();
    this.loadAll();
  }

  /** Supports deep-links from the dashboard "Getting Started" checklist, e.g.
   *  /organisation?tab=locations&add=1 opens the Locations tab with the add form open. */
  private applyRouteParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const tab = params.get('tab');
    if (tab === 'locations' || tab === 'departments' || tab === 'teams' || tab === 'tree') {
      this.activeTab = tab;
    }

    if (params.get('add') === '1' && this.isCompanyAdmin) {
      this.showLocationForm = this.activeTab === 'locations';
      this.showDepartmentForm = this.activeTab === 'departments';
      this.showTeamForm = this.activeTab === 'teams';
    }
  }

  loadAll(): void {
    this.orgService.getTree().subscribe((res: any) => (this.tree = res));
    this.orgService.getLocations().subscribe((res: any) => (this.locations = res));
    this.orgService.getDepartments().subscribe((res: any) => (this.departments = res));
    this.orgService.getTeams().subscribe((res: any) => (this.teams = res));
    this.employeesService.list().subscribe({
      next: (res: any) => {
        this.employees = res?.data ?? res ?? [];
        this.employeeOptions = this.employees.map((emp: any) => ({
          id: Number(emp.id),
          label: this.employeeName(emp),
        }));
      },
    });
  }

  // --- Member lookups (computed from the employee list; no backend change) -----

  employeeName(emp: any): string {
    return `${emp?.user?.firstName ?? ''} ${emp?.user?.lastName ?? ''}`.trim() || emp?.employeeCode || `#${emp?.id}`;
  }

  employeeInitials(emp: any): string {
    const name = this.employeeName(emp);
    const parts = name.split(' ').filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
  }

  membersOfDepartment(departmentId: number): any[] {
    return this.employees.filter(
      (emp) => (emp?.departmentId ?? emp?.departmentRelation?.id) === departmentId,
    );
  }

  membersOfTeam(teamId: number): any[] {
    return this.employees.filter((emp) => (emp?.teamId ?? emp?.team?.id) === teamId);
  }

  private resolveEmployeeLocationId(emp: any): number {
    const direct = emp?.locationId ?? emp?.location?.id;
    if (direct) {
      return direct;
    }
    const deptId = emp?.departmentId ?? emp?.departmentRelation?.id;
    const dept = this.departments.find((d) => d.id === deptId);
    return dept?.locationId ?? dept?.location?.id ?? 0;
  }

  membersOfLocation(locationId: number): any[] {
    return this.employees.filter((emp) => this.resolveEmployeeLocationId(emp) === locationId);
  }

  // --- Expand/collapse toggles -------------------------------------------------

  toggleDepartment(id: number): void {
    this.expandedDepartments.has(id) ? this.expandedDepartments.delete(id) : this.expandedDepartments.add(id);
  }
  isDepartmentExpanded(id: number): boolean {
    return this.expandedDepartments.has(id);
  }

  toggleTeam(id: number): void {
    this.expandedTeams.has(id) ? this.expandedTeams.delete(id) : this.expandedTeams.add(id);
  }
  isTeamExpanded(id: number): boolean {
    return this.expandedTeams.has(id);
  }

  toggleLocation(id: number): void {
    this.expandedLocations.has(id) ? this.expandedLocations.delete(id) : this.expandedLocations.add(id);
  }
  isLocationExpanded(id: number): boolean {
    return this.expandedLocations.has(id);
  }

  managerLabel(managerId: number | null | undefined): string {
    if (!managerId) return '—';
    return this.employeeOptions.find((e) => e.id === managerId)?.label ?? `#${managerId}`;
  }

  isBusy(id: number): boolean {
    return this.mutatingId === id;
  }

  createLocation(): void {
    if (!this.locationForm.name.trim()) {
      this.showMsg('Name is required.', 'error');
      return;
    }
    this.orgService
      .createLocation({ name: this.locationForm.name.trim(), address: this.locationForm.address.trim() || undefined })
      .subscribe({
        next: () => {
          this.showMsg('Location created.', 'success');
          this.locationForm = { name: '', address: '' };
          this.showLocationForm = false;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
      });
  }

  createDepartment(): void {
    if (!this.departmentForm.name.trim()) {
      this.showMsg('Name is required.', 'error');
      return;
    }
    this.orgService
      .createDepartment({
        name: this.departmentForm.name.trim(),
        locationId: this.departmentForm.locationId || undefined,
        managerId: this.departmentForm.managerId || null,
      })
      .subscribe({
        next: () => {
          this.showMsg('Department created.', 'success');
          this.departmentForm = { name: '', locationId: 0, managerId: 0 };
          this.showDepartmentForm = false;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
      });
  }

  createTeam(): void {
    if (!this.teamForm.name.trim() || !this.teamForm.departmentId) {
      this.showMsg('Name and department are required.', 'error');
      return;
    }
    this.orgService
      .createTeam({ name: this.teamForm.name.trim(), departmentId: this.teamForm.departmentId })
      .subscribe({
        next: () => {
          this.showMsg('Team created.', 'success');
          this.teamForm = { name: '', departmentId: 0 };
          this.showTeamForm = false;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
      });
  }

  openEditLocation(item: any): void {
    this.editingLocation = item;
    this.locationEditForm = { name: item.name ?? '', address: item.address ?? '' };
  }

  closeLocationEdit(): void {
    if (!this.editBusy) this.editingLocation = null;
  }

  submitLocationEdit(): void {
    if (!this.editingLocation || !this.locationEditForm.name.trim()) return;
    this.mutatingId = this.editingLocation.id;
    this.editBusy = true;
    this.orgService
      .updateLocation(this.editingLocation.id, {
        name: this.locationEditForm.name.trim(),
        address: this.locationEditForm.address.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.showMsg('Location updated.', 'success');
          this.editingLocation = null;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to update location.', 'error'),
        complete: () => {
          this.mutatingId = null;
          this.editBusy = false;
        },
      });
  }

  openEditDepartment(item: any): void {
    this.editingDepartment = item;
    this.departmentEditForm = {
      name: item.name ?? '',
      locationId: item.locationId ?? item.location?.id ?? 0,
      managerId: item.managerId ?? item.manager?.id ?? 0,
    };
  }

  closeDepartmentEdit(): void {
    if (!this.editBusy) this.editingDepartment = null;
  }

  submitDepartmentEdit(): void {
    if (!this.editingDepartment || !this.departmentEditForm.name.trim()) return;
    this.mutatingId = this.editingDepartment.id;
    this.editBusy = true;
    this.orgService
      .updateDepartment(this.editingDepartment.id, {
        name: this.departmentEditForm.name.trim(),
        locationId: this.departmentEditForm.locationId || null,
        managerId: this.departmentEditForm.managerId || null,
      })
      .subscribe({
        next: () => {
          this.showMsg('Department updated.', 'success');
          this.editingDepartment = null;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to update department.', 'error'),
        complete: () => {
          this.mutatingId = null;
          this.editBusy = false;
        },
      });
  }

  openEditTeam(item: any): void {
    this.editingTeam = item;
    this.teamEditForm = { name: item.name ?? '', departmentId: item.departmentId ?? item.department?.id ?? 0 };
  }

  closeTeamEdit(): void {
    if (!this.editBusy) this.editingTeam = null;
  }

  submitTeamEdit(): void {
    if (!this.editingTeam || !this.teamEditForm.name.trim() || !this.teamEditForm.departmentId) return;
    this.mutatingId = this.editingTeam.id;
    this.editBusy = true;
    this.orgService
      .updateTeam(this.editingTeam.id, {
        name: this.teamEditForm.name.trim(),
        departmentId: this.teamEditForm.departmentId,
      })
      .subscribe({
        next: () => {
          this.showMsg('Team updated.', 'success');
          this.editingTeam = null;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to update team.', 'error'),
        complete: () => {
          this.mutatingId = null;
          this.editBusy = false;
        },
      });
  }

  promptDelete(type: DeleteTarget['type'], item: any): void {
    this.deleteTarget = { type, item };
  }

  closeDeleteDialog(): void {
    if (!this.confirmBusy) this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const { type, item } = this.deleteTarget;
    this.confirmBusy = true;
    this.mutatingId = item.id;

    const request =
      type === 'location'
        ? this.orgService.deleteLocation(item.id)
        : type === 'department'
          ? this.orgService.deleteDepartment(item.id)
          : this.orgService.deleteTeam(item.id);

    request.subscribe({
      next: () => {
        this.showMsg(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
        this.deleteTarget = null;
        this.loadAll();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Delete failed.', 'error'),
      complete: () => {
        this.mutatingId = null;
        this.confirmBusy = false;
      },
    });
  }

  deleteDialogTitle(): string {
    if (!this.deleteTarget) return 'Delete?';
    const label = this.deleteTarget.type;
    return `Delete ${label}?`;
  }

  deleteDialogMessage(): string {
    if (!this.deleteTarget) return '';
    return `Delete "${this.deleteTarget.item?.name}"? This cannot be undone.`;
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
  }
}
