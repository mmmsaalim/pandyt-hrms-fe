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

    return [
      { path: '/dashboard', label: 'Dashboard', show: true },
      { path: '/tenants', label: 'Tenants', show: isSuper },
      { path: '/employees', label: 'Employees', show: isSuper || isCompany },
      { path: '/leave', label: 'Leave', show: true },
      { path: '/attendance', label: 'Attendance', show: true },
      { path: '/payroll', label: 'Payroll', show: isSuper || isCompany },
      { path: '/payslips', label: 'Payslips', show: true },
      { path: '/recruitment', label: 'Recruitment', show: isSuper || isCompany },
      { path: '/reports', label: 'Reports', show: isSuper || isCompany },
    ].filter((x) => x.show);
  });

  constructor(private readonly auth: AuthService) {}
}
