import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaveService } from '../../core/services/leave.service';

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

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  readonly months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  readonly growthSeries = [182, 189, 197, 205, 214, 228, 238];
  readonly attendance = [223, 226, 224, 220, 216];
  readonly attendanceLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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
    { label: 'Engineering', value: 86, color: '#4c58db' },
    { label: 'Sales', value: 42, color: '#10b7c7' },
    { label: 'Design', value: 28, color: '#55bf67' },
    { label: 'People', value: 19, color: '#f6a912' },
    { label: 'Finance', value: 22, color: '#e048b2' },
    { label: 'Other', value: 37, color: '#8b98b7' },
  ];

  readonly split_super = [
    { label: 'BASIC Plan', value: 8, color: '#4c58db' },
    { label: 'STANDARD Plan', value: 5, color: '#10b7c7' },
    { label: 'PRO Plan', value: 3, color: '#55bf67' },
    { label: 'ENTERPRISE', value: 2, color: '#f6a912' },
  ];

  split: typeof this.split_company = this.split_company;

  approvals: ApprovalCard[] = [];

  readonly donutGradient = this.buildDonutGradient();
  readonly chartPoints = this.buildChartPoints();

  greetingName = 'Priya';
  isEmployeeView = false;
  employeeData: EmployeeDashboardData | null = null;
  isSuperAdmin = false;
  isCompanyAdmin = false;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly auth: AuthService,
    private readonly leaveService: LeaveService,
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
    const totalEmployees = Number(data.totalEmployees ?? 0);
    const totalRevenue = Number(data.totalRevenue ?? 0);

    this.split = this.split_super;

    this.stats = [
      {
        label: 'Total tenants',
        value: tenants.toLocaleString(),
        detail: 'Active companies',
        trend: '+3.2%',
        icon: '🏢',
        accent: 'violet',
      },
      {
        label: 'Platform users',
        value: totalEmployees.toLocaleString(),
        detail: 'Across all tenants',
        trend: '+5.1%',
        icon: '👥',
        accent: 'mint',
      },
      {
        label: 'Monthly revenue',
        value: `$${(totalRevenue / 1000).toFixed(1)}K`,
        detail: 'Platform total',
        trend: '+8.4%',
        icon: '💰',
        accent: 'sky',
      },
      {
        label: 'Active companies',
        value: activeTenants.toLocaleString(),
        detail: 'On current plan',
        trend: '+2.1%',
        icon: '🎯',
        accent: 'amber',
      },
    ];
  }

  private setCompanyAdminStats(data: any): void {
    const employees = Number(data.employees ?? 0);
    const payrollRuns = Number(data.payrollRuns ?? 0);
    const leavePending = Number(data.leavePending ?? 0);

    this.split = this.split_company;

    this.stats = [
      {
        label: 'Total employees',
        value: employees.toLocaleString(),
        detail: 'In your company',
        trend: '+2.8%',
        icon: '👥',
        accent: 'violet',
      },
      {
        label: 'Present today',
        value: Math.max(employees - leavePending, 0).toLocaleString(),
        detail: 'Excluding pending leave',
        trend: '+1.1%',
        icon: '🗓',
        accent: 'mint',
      },
      {
        label: 'Payroll (Apr)',
        value: `$${(Math.max(payrollRuns * 0.16, 0.08)).toFixed(2)}M`,
        detail: 'Runs completed',
        trend: '+0.8%',
        icon: '💳',
        accent: 'sky',
      },
      {
        label: 'Open positions',
        value: Math.max(Math.round(employees * 0.06), 1).toLocaleString(),
        detail: 'Hiring demand',
        trend: '-1',
        icon: '🧑‍💼',
        accent: 'amber',
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
    this.greetingName = this.auth.user()?.firstName || 'Priya';
    const userRoles = this.auth.user()?.roles ?? [];
    this.isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    this.isCompanyAdmin = userRoles.includes('COMPANY_ADMIN');
    this.isEmployeeView = false;
    this.employeeData = null;

    if (userRoles.includes('SUPER_ADMIN')) {
      this.dashboardService.superAdmin().subscribe({
        next: (data: any) => this.setSuperAdminStats(data),
      });
      return;
    }

    if (userRoles.includes('COMPANY_ADMIN')) {
      this.dashboardService.companyAdmin().subscribe({
        next: (data: any) => {
          this.setCompanyAdminStats(data);
          this.loadCompanyPendingApprovals();
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
  }

  attendanceHeight(value: number) {
    return Math.max(24, Math.round((value / 240) * 130));
  }

  get newButtonLabel(): string {
    if (this.isSuperAdmin) {
      return '+ New Tenant';
    }

    if (this.isCompanyAdmin) {
      return '+ Add Employee';
    }

    return '+ New';
  }

  onNewClick(): void {
    if (this.isSuperAdmin) {
      this.router.navigate(['/tenants'], { queryParams: { new: '1' } });
      return;
    }

    if (this.isCompanyAdmin) {
      this.router.navigate(['/employees'], { queryParams: { new: '1' } });
    }
  }

  private buildChartPoints(): string {
    const max = Math.max(...this.growthSeries);
    const min = Math.min(...this.growthSeries);
    const width = 100;
    const height = 46;

    return this.growthSeries
      .map((value, index) => {
        const x = (index / (this.growthSeries.length - 1)) * width;
        const normalized = (value - min) / Math.max(max - min, 1);
        const y = height - normalized * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
  }

  private buildDonutGradient(): string {
    const total = this.split.reduce((acc, item) => acc + item.value, 0);
    let running = 0;

    return this.split
      .map((item) => {
        const start = (running / total) * 100;
        running += item.value;
        const end = (running / total) * 100;
        return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      })
      .join(', ');
  }
}
