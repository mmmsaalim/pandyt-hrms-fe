import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService, InviteRole } from '../../core/services/employees.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
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
          this.successMessage = `Employee created for ${res?.employee?.user?.email || 'employee'} with temporary password ${res?.temporaryPassword || 'admin@123'}.`;
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

    const nextDepartment = window.prompt('Department', employee?.department ?? '');
    if (nextDepartment === null) {
      return;
    }

    const nextDesignation = window.prompt('Designation', employee?.designation ?? '');
    if (nextDesignation === null) {
      return;
    }

    const nextStatus = window.prompt(
      'Employment status (ACTIVE, ON_PROBATION, INACTIVE)',
      employee?.employmentStatus ?? 'ACTIVE',
    );
    if (nextStatus === null) {
      return;
    }

    this.mutatingEmployeeId = employee.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService
      .updateEmployee(employee.id, {
        department: nextDepartment.trim(),
        designation: nextDesignation.trim(),
        employmentStatus: nextStatus.trim() as 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE',
      })
      .subscribe({
        next: () => {
          this.successMessage = `${employee?.user?.firstName || 'Employee'} updated successfully.`;
          this.loadEmployees();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update employee.';
        },
        complete: () => {
          this.mutatingEmployeeId = null;
        },
      });
  }

  deleteEmployee(employee: any): void {
    if (!this.isCompanyAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${employee?.user?.firstName || 'this employee'}? This will remove the employee record.`,
    );
    if (!confirmed) {
      return;
    }

    this.mutatingEmployeeId = employee.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.successMessage = `${employee?.user?.firstName || 'Employee'} deleted successfully.`;
        this.loadEmployees();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete employee.';
      },
      complete: () => {
        this.mutatingEmployeeId = null;
      },
    });
  }

  editSalary(employee: any): void {
    if (!this.isCompanyAdmin) { return; }
    const input = window.prompt(`Set salary (LKR) for ${employee?.user?.firstName || 'Employee'}`, String(employee?.salary ?? 0));
    if (input === null) { return; }
    const salary = parseFloat(input);
    if (isNaN(salary) || salary < 0) { this.errorMessage = 'Invalid salary value.'; return; }
    this.mutatingEmployeeId = employee.id;
    this.employeesService.updateSalary(employee.id, salary).subscribe({
      next: () => { this.successMessage = 'Salary updated.'; this.loadEmployees(); },
      error: (err) => { this.errorMessage = err?.error?.message || 'Failed to update salary.'; },
      complete: () => { this.mutatingEmployeeId = null; },
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
