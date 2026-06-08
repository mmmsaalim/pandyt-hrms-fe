import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, InviteRole } from '../../core/services/employees.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
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
  isCompanyAdmin = false;
  showCreateForm = false;
  creating = false;
  mutatingEmployeeId: number | null = null;
  errorMessage = '';
  successMessage = '';
  editingEmployeeId: number | null = null;
  editBusy = false;
  editForm = {
    department: '',
    designation: '',
    employmentStatus: 'ACTIVE' as 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE',
  };
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
    designation: '',
    role: 'EMPLOYEE' as InviteRole,
    employeeCode: '',
  };

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.isCompanyAdmin = roles.includes('COMPANY_ADMIN');

    this.route.queryParamMap.subscribe((params) => {
      this.showCreateForm = this.isCompanyAdmin && params.get('new') === '1';
    });

    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeesService.list().subscribe((rows: any) => (this.employees = rows));
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
    if (!this.isCompanyAdmin) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.showCreateForm = true;
  }

  createEmployee(): void {
    if (!this.isCompanyAdmin) {
      return;
    }

    if (!this.form.workEmail.trim() || !this.form.name.trim() || !this.form.department.trim()) {
      this.errorMessage = 'Name, work email, and department are required.';
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService
      .inviteEmployee({
        name: this.form.name.trim(),
        workEmail: this.form.workEmail.trim(),
        department: this.form.department.trim(),
        designation: this.form.designation.trim(),
        role: this.form.role,
        employeeCode: this.form.employeeCode.trim() || undefined,
      })
      .subscribe({
        next: (res: any) => {
          this.form = {
            name: '',
            workEmail: '',
            department: '',
            designation: '',
            role: 'EMPLOYEE',
            employeeCode: '',
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
      department: employee?.department ?? '',
      designation: employee?.designation ?? '',
      employmentStatus: (employee?.employmentStatus ?? 'ACTIVE') as 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE',
    };
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

    this.mutatingEmployeeId = this.editingEmployeeId;
    this.editBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService
      .updateEmployee(this.editingEmployeeId, {
        department: this.editForm.department.trim(),
        designation: this.editForm.designation.trim(),
        employmentStatus: this.editForm.employmentStatus,
      })
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
    if (!this.isCompanyAdmin) { return; }
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
      error: (err) => { this.errorMessage = err?.error?.message || 'Export failed.'; },
      complete: () => { this.mutatingEmployeeId = null; },
    });
  }
}
