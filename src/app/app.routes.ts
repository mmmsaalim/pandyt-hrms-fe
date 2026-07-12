import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './pages/auth/login/login.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { EmployeesPageComponent } from './pages/employees/employees-page.component';
import { LeavePageComponent } from './pages/leave/leave-page.component';
import { AttendancePageComponent } from './pages/attendance/attendance-page.component';
import { PayrollPageComponent } from './pages/payroll/payroll-page.component';
import { PayslipsPageComponent } from './pages/payslips/payslips-page.component';
import { RecruitmentPageComponent } from './pages/recruitment/recruitment-page.component';
import { ReportsPageComponent } from './pages/reports/reports-page.component';
import { TenantsPageComponent } from './pages/tenants/tenants-page.component';
import { LeadsPageComponent } from './pages/leads/leads-page.component';
import { CompanyPaymentsPageComponent } from './pages/company-payments/company-payments-page.component';
import { AcceptInvitationPageComponent } from './pages/auth/accept-invitation/accept-invitation-page.component';
import { SetPasswordPageComponent } from './pages/auth/set-password/set-password-page.component';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/auth/reset-password/reset-password-page.component';
import { SignupPageComponent } from './pages/auth/signup/signup-page.component';
import { InvitationsPageComponent } from './pages/invitations/invitations-page.component';
import { ConfigurationPageComponent } from './pages/configuration/configuration-page.component';
import { OrganisationPageComponent } from './pages/organisation/organisation-page.component';
import { CareersPageComponent } from './pages/careers-page.component';
import { PlatformCatalogPageComponent } from './pages/platform-catalog/platform-catalog-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';
import { CanteenPageComponent } from './pages/canteen/canteen-page.component';
import { TenantModuleSettingsPageComponent } from './pages/configuration/tenant-module-settings-page.component';
import { LettersPageComponent } from './pages/letters/letters-page.component';
import { FeedbackPageComponent } from './pages/feedback/feedback-page.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'accept-invitation', component: AcceptInvitationPageComponent },
  { path: 'set-password', component: SetPasswordPageComponent },
  { path: 'careers/:companyCode', component: CareersPageComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'profile', component: ProfilePageComponent },
      {
        path: 'tenants',
        component: TenantsPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'leads',
        component: LeadsPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'company-payments',
        component: CompanyPaymentsPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'platform/catalog',
        component: PlatformCatalogPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'employees',
        component: EmployeesPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['employees.read'],
          module: 'employees',
        },
      },
      {
        path: 'organisation',
        component: OrganisationPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['COMPANY_ADMIN'], module: 'organisation' },
      },
      {
        path: 'leave',
        component: LeavePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['leave.read'],
          module: 'leave',
        },
      },
      {
        path: 'attendance',
        component: AttendancePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['attendance.read'],
          module: 'attendance',
        },
      },
      {
        path: 'canteen',
        component: CanteenPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD'],
          permissions: ['canteen.read'],
          module: 'canteen',
        },
      },
      {
        path: 'payroll',
        component: PayrollPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['payroll.manage'],
          module: 'payroll',
        },
      },
      {
        path: 'payslips',
        component: PayslipsPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['payslips.manage'],
          module: 'payslips',
        },
      },
      {
        path: 'recruitment',
        component: RecruitmentPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER'],
          permissions: ['recruitment.read', 'recruitment.manage'],
          module: 'recruitment',
        },
      },
      {
        path: 'reports',
        component: ReportsPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
          permissions: ['reports.read'],
          module: 'reports',
        },
      },
      {
        path: 'invitations',
        component: InvitationsPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'],
          permissions: ['employees.invite'],
        },
      },
      {
        path: 'configuration',
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN'],
          permissions: ['configuration.manage'],
        },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users-permissions' },
          {
            path: 'users-permissions',
            component: ConfigurationPageComponent,
            data: { tab: 'users-permissions' },
          },
          {
            path: 'access-configuration',
            component: ConfigurationPageComponent,
            data: { tab: 'access-configuration' },
          },
          {
            path: 'security',
            component: ConfigurationPageComponent,
            data: { tab: 'security' },
          },
          {
            path: 'module-settings',
            component: TenantModuleSettingsPageComponent,
          },
        ],
      },
      {
        path: 'letters',
        component: LettersPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_LEAD'],
        },
      },
      {
        path: 'feedback',
        component: FeedbackPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['HR_MANAGER', 'TEAM_LEAD', 'COMPANY_ADMIN'],
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
