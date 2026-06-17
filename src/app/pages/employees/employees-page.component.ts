import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, InviteRole } from '../../core/services/employees.service';
import { OrganisationService } from '../../core/services/organisation.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService, TenantFieldRuntimeConfig } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ConfirmDialogComponent, EditDialogShellComponent],
  templateUrl: './employees-page.component.html',
  styleUrl: './employees-page.component.scss',
})
export class EmployeesPageComponent implements OnInit {
  employees: any[] = [];
  departments: any[] = [];
  teams: any[] = [];
  locations: any[] = [];

  isCompanyAdmin = false;
  canInviteEmployees = false;
  hasOrganisationModule = false;
  showCreateForm = false;
  creating = false;
  mutatingEmployeeId: number | null = null;
  errorMessage = '';
  successMessage = '';
  editingEmployeeId: number | null = null;
  editBusy = false;
  editForm = {
    departmentId: 0,
    teamId: 0,
    locationId: 0,
    designation: '',
    employmentStatus: 'ACTIVE' as 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE',
    customFields: {} as Record<string, unknown>,
  };
  customFieldDefs: TenantFieldRuntimeConfig[] = [];
  salaryEmployeeId: number | null = null;
  salaryBusy = false;
  salaryForm = {
    salary: 0,
  };
  deleteTarget: any | null = null;
  confirmBusy = false;
  form = {
    name: '',
    workEmail: '',
    department: '',
    departmentId: 0,
    teamId: 0,
    locationId: 0,
    designation: '',
    role: 'EMPLOYEE' as InviteRole,
    employeeCode: '',
    customFields: {} as Record<string, unknown>,
  };

  seatLimit = 0;
  seatUsage = 0;

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly organisationService: OrganisationService,
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.isCompanyAdmin = roles.includes('COMPANY_ADMIN');
    this.canInviteEmployees =
      this.isCompanyAdmin ||
      (roles.includes('HR_MANAGER') && this.auth.hasAnyPermission(['employees.invite']));
    this.hasOrganisationModule = this.auth.hasModule('organisation');
    this.customFieldDefs = this.auth.getModuleFields('employees');
    this.seatLimit = this.auth.user()?.tenantConfig?.seats ?? 0;

    this.route.queryParamMap.subscribe((params) => {
      this.showCreateForm = this.canInviteEmployees && params.get('new') === '1';
    });

    this.auth.refreshTenantConfig().subscribe({
      next: (config) => {
        this.auth.applyTenantConfig(config);
        this.customFieldDefs = config.fields?.['employees'] ?? [];
        this.seatLimit = config.seats ?? this.auth.user()?.tenantConfig?.seats ?? 0;
      },
      error: () => {
        this.customFieldDefs = this.auth.getModuleFields('employees');
      },
    });

    if (this.hasOrganisationModule) {
      this.loadOrgData();
    }
    this.loadEmployees();
  }

  loadOrgData(): void {
    if (!this.hasOrganisationModule) {
      return;
    }

    this.organisationService.getDepartments().subscribe({
      next: (rows: any) => (this.departments = rows),
      error: () => {
        this.departments = [];
      },
    });
    this.organisationService.getTeams().subscribe({
      next: (rows: any) => (this.teams = rows),
      error: () => {
        this.teams = [];
      },
    });
    this.organisationService.getLocations().subscribe({
      next: (rows: any) => (this.locations = rows),
      error: () => {
        this.locations = [];
      },
    });
  }

  loadEmployees(): void {
    this.employeesService.list().subscribe((rows: any) => {
      this.employees = rows;
      this.seatUsage = rows.filter((employee: any) => employee.employmentStatus !== 'INACTIVE').length;
    });
  }

  seatsRemaining(): number {
    if (!this.seatLimit) {
      return 0;
    }
    return Math.max(this.seatLimit - this.seatUsage, 0);
  }

  isAtSeatLimit(): boolean {
    return this.seatLimit > 0 && this.seatUsage >= this.seatLimit;
  }

  teamsForDepartment(departmentId: number): any[] {
    if (!departmentId) return [];
    return this.teams.filter((team) => team.departmentId === departmentId);
  }

  onCreateDepartmentChange(): void {
    this.form.teamId = 0;
    const department = this.departments.find((d) => d.id === this.form.departmentId);
    this.form.locationId = department?.locationId ?? department?.location?.id ?? 0;
  }

  onEditDepartmentChange(): void {
    const currentTeam = this.teams.find((t) => t.id === this.editForm.teamId);
    if (!currentTeam || currentTeam.departmentId !== this.editForm.departmentId) {
      this.editForm.teamId = 0;
    }
    const department = this.departments.find((d) => d.id === this.editForm.departmentId);
    this.editForm.locationId = department?.locationId ?? department?.location?.id ?? 0;
  }

  departmentLabel(employee: any): string {
    const dept = employee?.departmentRelation?.name ?? employee?.department ?? '—';
    const team = employee?.team?.name;
    return team ? `${dept} / ${team}` : dept;
  }

  private roleNames(employee: any): string[] {
    const roles = employee?.user?.roles;
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles
      .map((entry: any) => entry?.role?.name)
      .filter((value: unknown) => typeof value === 'string');
  }

  isCompanyAdminTarget(employee: any): boolean {
    return this.roleNames(employee).includes('COMPANY_ADMIN');
  }

  canDeleteEmployee(employee: any): boolean {
    return !this.isCompanyAdminTarget(employee);
  }

  isBusy(id: number): boolean {
    return this.mutatingEmployeeId === id;
  }

  openCreateForm(): void {
    if (!this.canInviteEmployees) {
      return;
    }

    if (this.isAtSeatLimit()) {
      this.errorMessage = `Seat limit reached (${this.seatUsage}/${this.seatLimit}). Upgrade your plan to add more employees.`;
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.showCreateForm = true;
    this.form.customFields = {};
  }

  createEmployee(): void {
    if (!this.canInviteEmployees) {
      return;
    }

    if (this.isAtSeatLimit()) {
      this.errorMessage = `Seat limit reached (${this.seatUsage}/${this.seatLimit}). Upgrade your plan to add more employees.`;
      return;
    }

    if (!this.form.workEmail.trim() || !this.form.name.trim()) {
      this.errorMessage = 'Name and work email are required.';
      return;
    }

    if (this.hasOrganisationModule && !this.form.departmentId) {
      this.errorMessage = 'Department is required.';
      return;
    }

    if (!this.hasOrganisationModule && !this.form.department.trim()) {
      this.errorMessage = 'Department name is required.';
      return;
    }

    for (const field of this.customFieldDefs) {
      if (
        field.required &&
        (this.form.customFields[field.fieldKey] === undefined || this.form.customFields[field.fieldKey] === '')
      ) {
        this.errorMessage = `${field.label} is required.`;
        return;
      }
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService
      .inviteEmployee({
        name: this.form.name.trim(),
        workEmail: this.form.workEmail.trim(),
        ...(this.hasOrganisationModule
          ? {
              departmentId: this.form.departmentId,
              teamId: this.form.teamId || undefined,
              locationId: this.form.locationId || undefined,
            }
          : {
              department: this.form.department.trim(),
            }),
        designation: this.form.designation.trim(),
        role: this.form.role,
        employeeCode: this.form.employeeCode.trim() || undefined,
        customFields: Object.keys(this.form.customFields).length ? this.form.customFields : undefined,
      })
      .subscribe({
        next: (res: any) => {
          this.form = {
            name: '',
            workEmail: '',
            department: '',
            departmentId: 0,
            teamId: 0,
            locationId: 0,
            designation: '',
            role: 'EMPLOYEE',
            employeeCode: '',
            customFields: {},
          };
          this.showCreateForm = false;
          this.successMessage = `Employee created for ${res?.employee?.user?.email || 'employee'}. Invitation email sent with the account setup link.`;
          this.loadEmployees();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create employee.';
          this.creating = false;
        },
        complete: () => {
          this.creating = false;
        },
      });
  }

  editEmployee(employee: any): void {
    if (!this.isCompanyAdmin) {
      return;
    }

    this.editingEmployeeId = employee.id;
    this.editBusy = false;
    this.editForm = {
      departmentId: employee?.departmentId ?? employee?.departmentRelation?.id ?? 0,
      teamId: employee?.teamId ?? employee?.team?.id ?? 0,
      locationId: employee?.locationId ?? employee?.location?.id ?? 0,
      designation: employee?.designation ?? '',
      employmentStatus: (employee?.employmentStatus ?? 'ACTIVE') as 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE',
      customFields: { ...(employee?.customFields ?? {}) },
    };
  }

  fieldOptions(field: TenantFieldRuntimeConfig): string[] {
    const options = field.options as { values?: string[] } | undefined;
    return options?.values ?? [];
  }

  closeEmployeeEditDialog(): void {
    if (this.editBusy) {
      return;
    }

    this.editingEmployeeId = null;
  }

  submitEmployeeEdit(): void {
    if (this.editingEmployeeId === null) {
      return;
    }

    if (!this.editForm.designation.trim()) {
      this.errorMessage = 'Designation is required.';
      return;
    }

    if (this.hasOrganisationModule && !this.editForm.departmentId) {
      this.errorMessage = 'Department is required.';
      return;
    }

    this.mutatingEmployeeId = this.editingEmployeeId;
    this.editBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.hasOrganisationModule
      ? {
          departmentId: this.editForm.departmentId,
          teamId: this.editForm.teamId || null,
          locationId: this.editForm.locationId || null,
          designation: this.editForm.designation.trim(),
          employmentStatus: this.editForm.employmentStatus,
          customFields: this.editForm.customFields,
        }
      : {
          designation: this.editForm.designation.trim(),
          employmentStatus: this.editForm.employmentStatus,
          customFields: this.editForm.customFields,
        };

    this.employeesService
      .updateEmployee(this.editingEmployeeId, payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Employee updated successfully.';
          this.editingEmployeeId = null;
          this.loadEmployees();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update employee.';
        },
        complete: () => {
          this.mutatingEmployeeId = null;
          this.editBusy = false;
        },
      });
  }

  deleteEmployee(employee: any): void {
    if (!this.isCompanyAdmin) {
      return;
    }

    if (!this.canDeleteEmployee(employee)) {
      this.errorMessage = 'Only SUPER_ADMIN can delete a COMPANY_ADMIN user.';
      return;
    }

    this.deleteTarget = employee;
  }

  closeDeleteDialog(): void {
    if (this.confirmBusy) {
      return;
    }

    this.deleteTarget = null;
  }

  confirmDeleteEmployee(): void {
    if (!this.deleteTarget) {
      return;
    }

    const employee = this.deleteTarget;
    this.confirmBusy = true;

    this.mutatingEmployeeId = employee.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.successMessage = `${employee?.user?.firstName || 'Employee'} deleted successfully.`;
        this.deleteTarget = null;
        this.loadEmployees();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete employee.';
      },
      complete: () => {
        this.mutatingEmployeeId = null;
        this.confirmBusy = false;
      },
    });
  }

  editSalary(employee: any): void {
    if (!this.isCompanyAdmin) {
      return;
    }

    this.salaryEmployeeId = employee.id;
    this.salaryBusy = false;
    this.salaryForm = {
      salary: Number(employee?.salary ?? 0),
    };
  }

  closeSalaryDialog(): void {
    if (this.salaryBusy) {
      return;
    }

    this.salaryEmployeeId = null;
  }

  submitSalary(): void {
    if (this.salaryEmployeeId === null) {
      return;
    }

    const salary = Number(this.salaryForm.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      this.errorMessage = 'Invalid salary value.';
      return;
    }

    this.mutatingEmployeeId = this.salaryEmployeeId;
    this.salaryBusy = true;
    this.employeesService.updateSalary(this.salaryEmployeeId, salary).subscribe({
      next: () => {
        this.successMessage = 'Salary updated.';
        this.salaryEmployeeId = null;
        this.loadEmployees();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update salary.';
      },
      complete: () => {
        this.mutatingEmployeeId = null;
        this.salaryBusy = false;
      },
    });
  }

  exportEmployee(employee: any): void {
    if (!this.isCompanyAdmin) {
      return;
    }
    this.mutatingEmployeeId = employee.id;
    this.employeesService.exportEmployee(employee.id).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee_${employee.id}_export.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.successMessage = 'Export downloaded.';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Export failed.';
      },
      complete: () => {
        this.mutatingEmployeeId = null;
      },
    });
  }
}
