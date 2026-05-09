import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeesService } from '../../core/services/employees.service';
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
  errorMessage = '';
  successMessage = '';
  form = {
    name: '',
    workEmail: '',
    department: '',
    designation: '',
    role: 'EMPLOYEE' as 'EMPLOYEE' | 'COMPANY_ADMIN',
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
          this.successMessage = `Invitation sent to ${res?.employee?.user?.email || 'employee'}.`;
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
}
