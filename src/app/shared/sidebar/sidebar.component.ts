import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  show: boolean;
}

interface NavGroup {
  type: 'group';
  key: string;
  label: string;
  children: Array<{ path: string; label: string }>;
}

type NavElement = NavItem | NavGroup;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  expandedGroups = new Set<string>();

  constructor(private readonly auth: AuthService) {
    if (this.auth.hasAnyPermission(['configuration.manage'])) {
      this.expandedGroups.add('configuration');
    }
    if (this.auth.user()?.roles?.includes('SUPER_ADMIN')) {
      this.expandedGroups.add('platform-configuration');
    }
  }

  toggleGroup(groupKey: string): void {
    if (this.expandedGroups.has(groupKey)) {
      this.expandedGroups.delete(groupKey);
    } else {
      this.expandedGroups.add(groupKey);
    }
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.expandedGroups.has(groupKey);
  }

  isGroup(item: NavElement): item is NavGroup {
    return (item as NavGroup).type === 'group';
  }

  readonly navItems = computed((): NavElement[] => {
    const userRoles = this.auth.user()?.roles ?? [];
    const isSuper = userRoles.includes('SUPER_ADMIN');
    const isCompany = userRoles.includes('COMPANY_ADMIN');
    const isHrManager = userRoles.includes('HR_MANAGER');
    const isTeamLead = userRoles.includes('TEAM_LEAD');
    const isEmployee = userRoles.includes('EMPLOYEE');
    const isTenantUser = isCompany || isHrManager || isTeamLead || isEmployee;
    const can = (permission: string) => isSuper || this.auth.hasAnyPermission([permission]);
    const moduleEnabled = (key: string) => isSuper || this.auth.hasModule(key);

    const baseItems: NavItem[] = [
      { path: '/dashboard', label: 'Dashboard', show: true },
      { path: '/tenants', label: 'Tenants', show: isSuper },
      { path: '/cross-tenant-reports', label: 'Cross-Tenant Reports', show: isSuper },
      { path: '/leads', label: 'Leads', show: isSuper },
      { path: '/company-payments', label: 'Company Payments', show: isSuper },
      { path: '/employees', label: 'Employees', show: isTenantUser && moduleEnabled('employees') && can('employees.read') },
      { path: '/organisation', label: 'Organisation', show: isCompany && moduleEnabled('organisation') },
      { path: '/leave', label: 'Leave', show: isTenantUser && moduleEnabled('leave') && can('leave.read') },
      { path: '/attendance', label: 'Attendance', show: isTenantUser && moduleEnabled('attendance') && can('attendance.read') },
      { path: '/canteen', label: 'Canteen', show: (isCompany || isHrManager || isTeamLead) && moduleEnabled('canteen') && can('canteen.read') },
      { path: '/payroll', label: 'Payroll', show: isTenantUser && moduleEnabled('payroll') && can('payroll.manage') },
      { path: '/payslips', label: 'Payslips', show: isTenantUser && moduleEnabled('payslips') && can('payslips.manage') },
      { path: '/recruitment', label: 'Recruitment', show: moduleEnabled('recruitment') && (can('recruitment.read') || can('recruitment.manage')) },
      { path: '/reports', label: 'Reports', show: isTenantUser && moduleEnabled('reports') && can('reports.read') },
      { path: '/invitations', label: 'Invitations', show: (isSuper || isCompany || isHrManager) && can('employees.invite') },
    ];

    const items: NavElement[] = baseItems.filter((x) => x.show);

    if (isSuper) {
      items.push({
        type: 'group',
        key: 'platform-configuration',
        label: 'Configuration',
        children: [{ path: '/platform/catalog', label: 'Platform Catalog & Billing' }],
      });
    }

    if (isCompany && can('configuration.manage')) {
      items.push({
        type: 'group',
        key: 'configuration',
        label: 'Configuration',
        children: [
          { path: '/configuration/users-permissions', label: 'Users & Permissions' },
          { path: '/configuration/access-configuration', label: 'Access Configuration' },
        ],
      });
    }

    return items;
  });
}
