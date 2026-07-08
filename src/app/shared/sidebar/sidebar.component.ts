import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { navIcon } from '../../core/constants/nav-icons';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  show: boolean;
}

interface NavGroup {
  type: 'group';
  key: string;
  label: string;
  icon: string;
  children: Array<{ path: string; label: string; icon: string }>;
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

  get companyName(): string {
    return this.auth.user()?.tenantName?.trim() || 'Your company';
  }

  get companyInitial(): string {
    return this.companyName.charAt(0).toUpperCase();
  }

  constructor(private readonly auth: AuthService) {
    if (this.auth.hasAnyPermission(['configuration.manage', 'employees.invite'])) {
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
    const moduleAccess = (key: string, permission: string) =>
      isSuper || this.auth.canAccessModule(key, [permission]);

    const baseItems: NavItem[] = [
      { path: '/dashboard', label: 'Dashboard', icon: navIcon('/dashboard'), show: true },
      { path: '/tenants', label: 'Tenants', icon: navIcon('/tenants'), show: isSuper },
      { path: '/leads', label: 'Leads', icon: navIcon('/leads'), show: isSuper },
      { path: '/company-payments', label: 'Company Payments', icon: navIcon('/company-payments'), show: isSuper },
      { path: '/reports', label: 'Platform Reports', icon: navIcon('/reports'), show: isSuper },
      { path: '/employees', label: 'Employees', icon: navIcon('/employees'), show: isTenantUser && moduleAccess('employees', 'employees.read') },
      { path: '/organisation', label: 'Organisation', icon: navIcon('/organisation'), show: isCompany && moduleEnabled('organisation') },
      { path: '/leave', label: 'Leave', icon: navIcon('/leave'), show: isTenantUser && moduleAccess('leave', 'leave.read') },
      { path: '/attendance', label: 'Attendance', icon: navIcon('/attendance'), show: isTenantUser && moduleAccess('attendance', 'attendance.read') },
      { path: '/canteen', label: 'Canteen', icon: navIcon('/canteen'), show: (isCompany || isHrManager || isTeamLead) && moduleAccess('canteen', 'canteen.read') },
      { path: '/payroll', label: 'Payroll', icon: navIcon('/payroll'), show: isTenantUser && moduleEnabled('payroll') && can('payroll.manage') },
      { path: '/payslips', label: 'Payslips', icon: navIcon('/payslips'), show: isTenantUser && moduleEnabled('payslips') && can('payslips.manage') },
      { path: '/recruitment', label: 'Recruitment', icon: navIcon('/recruitment'), show: !isSuper && moduleEnabled('recruitment') && (can('recruitment.read') || can('recruitment.manage') || this.auth.hasAssignedModuleRole('recruitment')) },
      { path: '/reports', label: 'Reports', icon: navIcon('/reports'), show: isTenantUser && moduleAccess('reports', 'reports.read') },
    ];

    const items: NavElement[] = baseItems.filter((x) => x.show);

    if (isSuper) {
      const platformChildren = [{ path: '/platform/catalog', label: 'Subscription & Billing', icon: navIcon('/platform/catalog') }];
      if (can('employees.invite')) {
        platformChildren.push({ path: '/invitations', label: 'Invitations', icon: navIcon('/invitations') });
      }
      items.push({
        type: 'group',
        key: 'platform-configuration',
        label: 'Configuration',
        icon: navIcon('Configuration'),
        children: platformChildren,
      });
    }

    if (isCompany && can('configuration.manage')) {
      const configChildren = [
        { path: '/configuration/users-permissions', label: 'Users & Permissions', icon: navIcon('/configuration/users-permissions') },
        { path: '/configuration/access-configuration', label: 'Access Configuration', icon: navIcon('/configuration/access-configuration') },
        { path: '/configuration/module-settings', label: 'Module & Templates', icon: navIcon('/configuration/module-settings') },
      ];
      if (can('employees.invite')) {
        configChildren.push({ path: '/invitations', label: 'Invitations', icon: navIcon('/invitations') });
      }
      items.push({
        type: 'group',
        key: 'configuration',
        label: 'Configuration',
        icon: navIcon('Configuration'),
        children: configChildren,
      });
    } else if (isHrManager && can('employees.invite')) {
      items.push({
        type: 'group',
        key: 'configuration',
        label: 'Configuration',
        icon: navIcon('Configuration'),
        children: [{ path: '/invitations', label: 'Invitations', icon: navIcon('/invitations') }],
      });
    }

    return items;
  });
}
