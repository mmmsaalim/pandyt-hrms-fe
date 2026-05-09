import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly navItems = computed(() => {
    const userRoles = this.auth.user()?.roles ?? [];
    const isSuper = userRoles.includes('SUPER_ADMIN');
    const isCompany = userRoles.includes('COMPANY_ADMIN');
    const isEmployee = userRoles.includes('EMPLOYEE');

    return [
      { path: '/dashboard', label: 'Dashboard', show: true },
      { path: '/tenants', label: 'Tenants', show: isSuper },
      { path: '/company-payments', label: 'Company Payments', show: isSuper },
      { path: '/employees', label: 'Employees', show: isCompany },
      { path: '/leave', label: 'Leave', show: isCompany || isEmployee },
      { path: '/attendance', label: 'Attendance', show: isCompany || isEmployee },
      { path: '/payroll', label: 'Payroll', show: isCompany },
      { path: '/payslips', label: 'Payslips', show: isCompany || isEmployee },
      { path: '/recruitment', label: 'Recruitment', show: isCompany },
      { path: '/reports', label: 'Reports', show: isCompany },
      { path: '/invitations', label: 'Invitations', show: isSuper || isCompany },
    ].filter((x) => x.show);
  });

  constructor(private readonly auth: AuthService) {}
}
