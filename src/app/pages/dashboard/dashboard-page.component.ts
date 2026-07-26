import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService, TenantFieldRuntimeConfig } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';
import { LeaveService } from '../../core/services/leave.service';
import { OrganisationService } from '../../core/services/organisation.service';
import { LeaveBalanceDisplayComponent } from '../leave/leave-balance-display.component';

interface StatCard {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: string;
  accent: 'violet' | 'mint' | 'sky' | 'amber';
}

interface EmployeeDashboardData {
  id: string;
  employeeCode: string;
  department: string;
  designation: string;
  joinedDate: string;
  attendance: Array<{ id: string; date: string; status: string; hours: number }>;
  leaveRequests: Array<{
    id: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    days: number;
  }>;
  payslips: Array<{ id: string; netPay: number; status: string }>;
  teamBirthdays?: Array<{ name: string; date: string; daysUntil: number }>;
  upcomingHolidays?: Array<{ name: string; date: string; daysUntil: number }>;
}

interface CompanyLeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  employee?: {
    employeeCode?: string;
    department?: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface ApprovalCard {
  initials: string;
  name: string;
  meta: string;
}

interface UpcomingBirthday {
  name: string;
  date: string;
  daysUntil: number;
}

interface UpcomingHoliday {
  name: string;
  date: string;
  daysUntil: number;
}

interface SetupStep {
  label: string;
  hint: string;
  done: boolean;
  link: string;
  queryParams: Record<string, string>;
  actionLabel: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, DecimalPipe, TitleCasePipe, RouterLink, LeaveBalanceDisplayComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  growthSeries = [182, 189, 197, 205, 214, 228, 238];
  attendance = [223, 226, 224, 220, 216];
  attendanceLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  payrollSeries = [0, 0, 0, 0, 0, 0, 0];
  payrollLabels = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

  stats: StatCard[] = [
    {
      label: 'Total employees',
      value: '0',
      detail: 'Across active teams',
      trend: '+0.0%',
      icon: '👥',
      accent: 'violet',
    },
    {
      label: 'Present today',
      value: '0',
      detail: 'Attendance synced',
      trend: '+0.0%',
      icon: '🗓',
      accent: 'mint',
    },
    {
      label: 'Payroll (Apr)',
      value: '$0.0M',
      detail: 'Processed amount',
      trend: '+0.0%',
      icon: '💳',
      accent: 'sky',
    },
    {
      label: 'Open positions',
      value: '0',
      detail: 'Hiring pipeline',
      trend: '-0',
      icon: '🧑‍💼',
      accent: 'amber',
    },
  ];

  readonly split_company = [
    { label: 'Engineering', value: 86, color: '#f47421' },
    { label: 'Sales', value: 42, color: '#10b7c7' },
    { label: 'Design', value: 28, color: '#55bf67' },
    { label: 'People', value: 19, color: '#f6a912' },
    { label: 'Finance', value: 22, color: '#e048b2' },
    { label: 'Other', value: 37, color: '#8b98b7' },
  ];

  readonly split_super = [
    { label: 'Freemium', value: 8, color: '#f47421' },
    { label: 'Starter', value: 5, color: '#10b7c7' },
    { label: 'Growth', value: 3, color: '#55bf67' },
    { label: 'Enterprise', value: 2, color: '#f6a912' },
  ];

  split: Array<{ label: string; value: number; color: string }> = [...this.split_company];

  approvals: ApprovalCard[] = [];
  recentHires: Array<any> = [];
  recruitmentFunnel: Array<{ stage: string; count: number }> = [];
  leaveTrendSeries: number[] = [];
  monthlyBurnRate = 0;
  attendancePct = 0;
  upcomingBirthdays: UpcomingBirthday[] = [];
  upcomingHolidays: UpcomingHoliday[] = [];

  // Segmented toggle for the combined "Coming up" card (employee view).
  comingUpTab: 'birthdays' | 'holidays' = 'birthdays';

  // "Employee details" panel: tenant custom fields can run long (many unset),
  // so only 6 show by default (filled ones prioritized) and the rest sit
  // behind a "Show more" toggle.
  showAllProfileFields = false;
  private readonly defaultFieldPreviewCount = 6;

  private hasCustomFieldValue(fieldKey: string): boolean {
    const value = this.employeeProfile?.customFields?.[fieldKey];
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  // Filled fields first so the default preview favors real data over blanks.
  private get orderedProfileFieldDefs(): TenantFieldRuntimeConfig[] {
    const filled = this.profileFieldDefs.filter((field) => this.hasCustomFieldValue(field.fieldKey));
    const empty = this.profileFieldDefs.filter((field) => !this.hasCustomFieldValue(field.fieldKey));
    return [...filled, ...empty];
  }

  get visibleProfileFieldDefs(): TenantFieldRuntimeConfig[] {
    return this.orderedProfileFieldDefs.slice(0, this.defaultFieldPreviewCount);
  }

  get hiddenProfileFieldDefs(): TenantFieldRuntimeConfig[] {
    return this.orderedProfileFieldDefs.slice(this.defaultFieldPreviewCount);
  }

  get donutGradient(): string {
    return this.buildDonutGradient(this.split);
  }

  get chartPoints(): string {
    return this.buildChartPoints(this.growthSeries);
  }

  greetingName = 'Priya';
  tenantName: string | null = null;
  isEmployeeView = false;
  employeeData: EmployeeDashboardData | null = null;
  employeeProfile: any = null;
  profileFieldDefs: TenantFieldRuntimeConfig[] = [];
  isSuperAdmin = false;
  isCompanyAdmin = false;
  canInviteEmployees = false;
  showPeopleTools = false;
  tenantsList: Array<any> = [];
  pendingLeads: Array<any> = [];
  billingReport: Array<any> = [];

  // Getting Started (org-first onboarding) checklist
  canSetupWorkspace = false;
  hasOrganisationModule = false;
  setupSteps: SetupStep[] = [];
  private setupDismissed = false;
  private orgCounts = { locations: 0, departments: 0, teams: 0 };
  private employeeCount = 0;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
    private readonly leaveService: LeaveService,
    private readonly organisationService: OrganisationService,
    private readonly router: Router,
  ) {}

  private initials(name: string): string {
    const parts = name.split(' ').filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'NA';
  }

  private approvalName(row: CompanyLeaveRow): string {
    const firstName = row.employee?.user?.firstName ?? '';
    const lastName = row.employee?.user?.lastName ?? '';
    return `${firstName} ${lastName}`.trim() || row.employee?.employeeCode || 'Employee';
  }

  private loadCompanyPendingApprovals(): void {
    this.leaveService.list().subscribe({
      next: (rows: any) => {
        this.approvals = (rows as CompanyLeaveRow[])
          .filter((row) => row.status === 'PENDING')
          .slice(0, 5)
          .map((row) => {
            const name = this.approvalName(row);
            return {
              initials: this.initials(name),
              name,
              meta: `${row.type} · ${new Date(row.startDate).toLocaleDateString()} - ${new Date(
                row.endDate,
              ).toLocaleDateString()} · ${row.days}d`,
            };
          });
      },
    });
  }

  private setSuperAdminStats(data: any): void {
    const tenants = Number(data.tenants ?? 0);
    const activeTenants = Number(data.activeTenants ?? 0);
    const suspendedTenants = Number(data.suspendedTenants ?? 0);
    const activeUsers = Number(data.activeUsers ?? data.totalUsers ?? 0);
    const inactiveUsers = Number(data.inactiveUsers ?? 0);
    const payingTenants = Number(data.payingTenants ?? 0);
    const pendingLeadsCount = Number(data.leads?.pending ?? 0);
    const totalEmployees = Number(data.totalEmployees ?? 0);

    this.months = Array.isArray(data.months) ? data.months : this.months;
    this.growthSeries = Array.isArray(data.growthSeries) ? data.growthSeries : this.growthSeries;
    this.split = Array.isArray(data.splitSeries) ? data.splitSeries : [...this.split_super];
    this.pendingLeads = Array.isArray(data.pendingLeads) ? data.pendingLeads : [];
    this.billingReport = Array.isArray(data.billingReport) ? data.billingReport : [];

    this.stats = [
      {
        label: 'Total tenants',
        value: tenants.toLocaleString(),
        detail: `${activeTenants} active · ${suspendedTenants} suspended`,
        trend: `${payingTenants} paying`,
        icon: '🏢',
        accent: 'violet',
      },
      {
        label: 'Platform users',
        value: activeUsers.toLocaleString(),
        detail: `${inactiveUsers} inactive accounts`,
        trend: 'Billable sign-ins',
        icon: '👥',
        accent: 'mint',
      },
      {
        label: 'Employees tracked',
        value: totalEmployees.toLocaleString(),
        detail: 'Across all tenant workspaces',
        trend: 'Usage basis',
        icon: '💳',
        accent: 'sky',
      },
      {
        label: 'Pending leads',
        value: pendingLeadsCount.toLocaleString(),
        detail: 'Awaiting super admin approval',
        trend: 'Lead queue',
        icon: '📋',
        accent: 'amber',
      },
    ];
  }

  private setCompanyAdminStats(data: any): void {
    const employees = Number(data.employees ?? 0);
    const leavePending = Number(data.leavePending ?? 0);
    const openPositions = Number(data.openPositions ?? 0);
    const monthlyBurnRate = Number(data.monthlyBurnRate ?? 0);
    const attendancePct = Number(data.attendancePct ?? 0);

    this.months = Array.isArray(data.months) ? data.months : this.months;
    this.growthSeries = Array.isArray(data.growthSeries) ? data.growthSeries : this.growthSeries;
    this.split = Array.isArray(data.splitSeries) ? data.splitSeries : [...this.split_company];
    this.attendanceLabels = Array.isArray(data.attendanceLabels) ? data.attendanceLabels : this.attendanceLabels;
    this.attendance = Array.isArray(data.attendanceSeries) ? data.attendanceSeries : this.attendance;
    this.payrollLabels = Array.isArray(data.payrollLabels) ? data.payrollLabels : this.payrollLabels;
    this.payrollSeries = Array.isArray(data.payrollRunsSeries) ? data.payrollRunsSeries : this.payrollSeries;
    this.leaveTrendSeries = Array.isArray(data.leaveTrendSeries) ? data.leaveTrendSeries : [];
    this.recentHires = Array.isArray(data.recentHires) ? data.recentHires : [];
    this.recruitmentFunnel = Array.isArray(data.recruitmentFunnel) ? data.recruitmentFunnel : [];
    this.upcomingBirthdays = Array.isArray(data.upcomingBirthdays) ? data.upcomingBirthdays : [];
    this.upcomingHolidays = Array.isArray(data.upcomingHolidays) ? data.upcomingHolidays : [];
    this.monthlyBurnRate = monthlyBurnRate;
    this.attendancePct = attendancePct;

    const burnLabel = monthlyBurnRate > 0
      ? `LKR ${(monthlyBurnRate / 1000).toFixed(0)}K`
      : 'No runs this month';

    this.stats = [
      {
        label: 'Total employees',
        value: employees.toLocaleString(),
        detail: 'Active headcount',
        trend: `${leavePending} pending leave`,
        icon: '👥',
        accent: 'violet',
      },
      {
        label: 'Open positions',
        value: openPositions.toLocaleString(),
        detail: 'Hiring pipeline',
        trend: 'Recruitment',
        icon: '🧑‍💼',
        accent: 'amber',
      },
      {
        label: 'Monthly burn rate',
        value: burnLabel,
        detail: 'Gross payroll this month',
        trend: 'Payroll',
        icon: '💳',
        accent: 'sky',
      },
      {
        label: 'Attendance today',
        value: `${attendancePct}%`,
        detail: 'Clock-ins vs headcount',
        trend: 'Attendance',
        icon: '🗓',
        accent: 'mint',
      },
    ];
  }

  private setEmployeeStats(data: any): void {
    const attendanceCount = (data?.attendance ?? []).length;
    const leaveCount = (data?.leaveRequests ?? []).length;
    const payslipCount = (data?.payslips ?? []).length;

    this.stats = [
      {
        label: 'My attendance',
        value: attendanceCount.toLocaleString(),
        detail: 'Recent records',
        trend: '+0',
        icon: '🗓',
        accent: 'mint',
      },
      {
        label: 'Leave requests',
        value: leaveCount.toLocaleString(),
        detail: 'Recent submissions',
        trend: '+0',
        icon: '🌴',
        accent: 'violet',
      },
      {
        label: 'Payslips',
        value: payslipCount.toLocaleString(),
        detail: 'Available to view',
        trend: '+0',
        icon: '💳',
        accent: 'sky',
      },
      {
        label: 'Department',
        value: data?.department ?? '-',
        detail: data?.designation ?? 'Employee profile',
        trend: 'active',
        icon: '🧑‍💼',
        accent: 'amber',
      },
    ];
  }

  ngOnInit(): void {
    const currentUser = this.auth.user();
    this.greetingName = currentUser?.firstName || 'Priya';
    this.tenantName = currentUser?.tenantName?.trim() || null;
    const userRoles = currentUser?.roles ?? [];
    this.isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    this.isCompanyAdmin = userRoles.includes('COMPANY_ADMIN') || userRoles.includes('HR_MANAGER') || userRoles.includes('TEAM_LEAD');
    // "+ Add Employee" must only appear for users who can actually invite
    // (permission-driven), so revoking employees.invite on a role in Access
    // Configuration also hides this shortcut. No HR_MANAGER role fallback — it
    // would override the very permission an admin just unticked.
    this.canInviteEmployees =
      this.auth.hasAnyPermission(['employees.invite']) || userRoles.includes('COMPANY_ADMIN');
    this.showPeopleTools =
      !this.isSuperAdmin &&
      (userRoles.includes('COMPANY_ADMIN') ||
        userRoles.includes('HR_MANAGER') ||
        userRoles.includes('TEAM_LEAD'));
    this.isEmployeeView = false;
    this.employeeData = null;

    if (userRoles.includes('SUPER_ADMIN')) {
      this.dashboardService.superAdmin().subscribe({
        next: (data: any) => this.setSuperAdminStats(data),
      });
      return;
    }

    if (userRoles.includes('COMPANY_ADMIN') || userRoles.includes('HR_MANAGER') || userRoles.includes('TEAM_LEAD')) {
      this.canSetupWorkspace = userRoles.includes('COMPANY_ADMIN') || userRoles.includes('HR_MANAGER');
      this.hasOrganisationModule = this.auth.hasModule('organisation');
      this.setupDismissed = this.readSetupDismissed();
      this.dashboardService.companyAdmin().subscribe({
        next: (data: any) => {
          this.setCompanyAdminStats(data);
          this.loadCompanyPendingApprovals();
          this.employeeCount = Number(data.employees ?? 0);
          this.loadSetupChecklist();
        },
      });
      return;
    }

    this.dashboardService.employeeMe().subscribe({
      next: (data: any) => {
        this.isEmployeeView = true;
        this.employeeData = data as EmployeeDashboardData;
        this.setEmployeeStats(data as EmployeeDashboardData);
      },
    });

    this.auth.refreshTenantConfig().subscribe({
      next: (config) => {
        this.auth.applyTenantConfig(config);
        this.profileFieldDefs = config.fields?.['employees'] ?? [];
      },
    });

    this.employeesService.getMe().subscribe({
      next: (profile) => {
        this.employeeProfile = profile;
      },
    });
  }

  currentGreeting(): string {
    const sriLankaHour = Number(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'Asia/Colombo',
      }).format(new Date()),
    );

    if (sriLankaHour < 5) {
      return 'Good night';
    }

    if (sriLankaHour < 12) {
      return 'Good morning';
    }

    if (sriLankaHour < 17) {
      return 'Good afternoon';
    }

    if (sriLankaHour < 21) {
      return 'Good evening';
    }

    return 'Good night';
  }

  attendanceHeight(value: number) {
    return Math.max(24, Math.round((value / 240) * 130));
  }

  get newButtonLabel(): string {
    if (this.isSuperAdmin) {
      return '+ New Tenant';
    }

    if (this.canInviteEmployees) {
      return '+ Add Employee';
    }

    return '+ New';
  }

  get showNewButton(): boolean {
    return this.isSuperAdmin || this.canInviteEmployees;
  }

  onNewClick(): void {
    if (this.isSuperAdmin) {
      this.router.navigate(['/tenants'], { queryParams: { new: '1' } });
      return;
    }

    if (this.canInviteEmployees) {
      this.router.navigate(['/employees'], { queryParams: { new: '1' } });
    }
  }

  // --- Getting Started checklist ---------------------------------------------

  get showSetupChecklist(): boolean {
    return (
      this.canSetupWorkspace &&
      this.hasOrganisationModule &&
      !this.setupDismissed &&
      this.setupSteps.length > 0 &&
      !this.setupComplete
    );
  }

  get setupComplete(): boolean {
    return this.setupSteps.length > 0 && this.setupSteps.every((step) => step.done);
  }

  get setupCompletedCount(): number {
    return this.setupSteps.filter((step) => step.done).length;
  }

  dismissSetupChecklist(): void {
    this.setupDismissed = true;
    try {
      localStorage.setItem(this.setupStorageKey(), '1');
    } catch {
      // localStorage unavailable — dismissal just won't persist across reloads.
    }
  }

  private loadSetupChecklist(): void {
    if (!this.canSetupWorkspace || !this.hasOrganisationModule || this.setupDismissed) {
      return;
    }

    this.organisationService.getLocations().subscribe({
      next: (rows: any) => {
        this.orgCounts.locations = Array.isArray(rows) ? rows.length : 0;
        this.buildSetupSteps();
      },
    });
    this.organisationService.getDepartments().subscribe({
      next: (rows: any) => {
        this.orgCounts.departments = Array.isArray(rows) ? rows.length : 0;
        this.buildSetupSteps();
      },
    });
    this.organisationService.getTeams().subscribe({
      next: (rows: any) => {
        this.orgCounts.teams = Array.isArray(rows) ? rows.length : 0;
        this.buildSetupSteps();
      },
    });
  }

  private buildSetupSteps(): void {
    this.setupSteps = [
      {
        label: 'Add a location',
        hint: 'Where your teams work',
        done: this.orgCounts.locations > 0,
        link: '/organisation',
        queryParams: { tab: 'locations', add: '1' },
        actionLabel: 'Add location',
      },
      {
        label: 'Add a department',
        hint: 'Group employees by function',
        done: this.orgCounts.departments > 0,
        link: '/organisation',
        queryParams: { tab: 'departments', add: '1' },
        actionLabel: 'Add department',
      },
      {
        label: 'Add a team',
        hint: 'Teams sit under a department',
        done: this.orgCounts.teams > 0,
        link: '/organisation',
        queryParams: { tab: 'teams', add: '1' },
        actionLabel: 'Add team',
      },
      {
        label: 'Invite employees',
        hint: 'Send email invites or add manually',
        done: this.employeeCount > 1,
        link: '/employees',
        queryParams: { new: '1' },
        actionLabel: 'Invite',
      },
    ];
  }

  private setupStorageKey(): string {
    return `flowhr:setupDismissed:${this.auth.user()?.tenantId ?? 'unknown'}`;
  }

  private readSetupDismissed(): boolean {
    try {
      return localStorage.getItem(this.setupStorageKey()) === '1';
    } catch {
      return false;
    }
  }

  buildLeaveChartPoints(): string {
    return this.buildChartPoints(this.leaveTrendSeries);
  }

  hasNoLeaveTrendData(): boolean {
    return !this.leaveTrendSeries.length || this.leaveTrendSeries.every((value) => value === 0);
  }

  hasNoRecruitmentFunnelData(): boolean {
    return !this.recruitmentFunnel.length || this.recruitmentFunnel.every((row) => row.count === 0);
  }

  funnelBarWidth(count: number): number {
    const maxCount = Math.max(...this.recruitmentFunnel.map((r) => r.count), 1);
    return Math.round((count / maxCount) * 100);
  }

  private buildChartPoints(series: number[]): string {
    const max = Math.max(...series);
    const min = Math.min(...series);
    const width = 100;
    const height = 46;

    return series
      .map((value, index) => {
        const x = series.length > 1 ? (index / (series.length - 1)) * width : 0;
        const normalized = (value - min) / Math.max(max - min, 1);
        const y = height - normalized * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
  }

  private buildDonutGradient(items: Array<{ value: number; color: string }>): string {
    const total = items.reduce((acc, item) => acc + item.value, 0);
    let running = 0;

    return items
      .map((item) => {
        const start = (running / total) * 100;
        running += item.value;
        const end = (running / total) * 100;
        return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      })
      .join(', ');
  }
}
