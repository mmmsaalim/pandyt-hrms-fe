# FE Instructions (FlowHR)

## 1) Purpose
Single source for frontend context. This file is written for both humans and AI agents to quickly understand:
- project structure
- current delivery status
- implemented scope
- next target scope

## 2) Frontend Snapshot
- Stack: Angular (standalone components)
- API mode: cookie session (`withCredentials`) + tenant header propagation
- App style: route-guarded shell + role-based UX controls
- Current status: security baseline and core MVP complete, preparing next roadmap scope

## 3) Frontend Structure
Main folders used in frontend:
- `src/app/core/guards` - auth and role guards
- `src/app/core/interceptors` - auth cookie and `X-Tenant-ID` propagation
- `src/app/core/services` - API service layer (auth, tenants, employees, etc.)
- `src/app/shared/layout` - shell layout
- `src/app/shared/sidebar` - role-aware navigation
- `src/app/shared/topbar` - user/top navigation
- `src/app/pages/auth` - login and invitation acceptance flows
- `src/app/pages/dashboard` - role-based dashboard views
- `src/app/pages/tenants` - super admin tenant onboarding UI
- `src/app/pages/employees` - employee list, invite, salary update, export
- `src/app/pages/leave` - request, approval, balances, policies
- `src/app/pages/attendance` - clock-in/out and overrides
- `src/app/pages/payroll` - run creation and processing
- `src/app/pages/payslips` - payslip views
- `src/app/pages/organisation` - org tree and CRUD forms
- `src/app/pages/recruitment` - ATS screens
- `src/app/pages/reports` - reporting screens
- `src/environments/environment.ts` - API base URL config

## 4) Role Model (Current)
- `SUPER_ADMIN`: tenant lifecycle UX only
- `COMPANY_ADMIN`: full tenant operations UX
- `HR_MANAGER`: tenant-wide HR operations UX
- `TEAM_LEAD`: scoped team operations UX
- `EMPLOYEE`: self-service UX

## 5) Security Baseline Status (Complete)
Implemented and active:
- Login with `email`, `password`, `companyCode` (company code required for non-super-admin users)
- Session handled via backend HttpOnly cookie
- Interceptor sends `withCredentials: true`
- Interceptor appends `X-Tenant-ID` when user has tenant context
- Protected routing via auth guards

Core routes:
- Public: `/login`, `/accept-invitation`, `/set-password`
- Public: `/forgot-password`, `/reset-password`
- Protected: app layout routes under authenticated shell

## 6) Core MVP Status (Complete)
Implemented and active:
- Dashboard role-specific UX (super admin/company admin/employee)
- Tenant onboarding UI (`/tenants?new=1`) for super admin
- Employee invite and management UI (`/employees?new=1`)
- Invite role support in UI: `EMPLOYEE | TEAM_LEAD | HR_MANAGER | COMPANY_ADMIN`
- Leave request and approval UX + balances/policies
- Attendance clock-in/out and admin override UX
- Payroll run create/process UX
- Payslip statutory columns UX
- Organisation tree and location/department/team forms
- Reports and recruitment pages connected to backend APIs

## 7) Next Scope (Planned)
Planned next roadmap items:
- richer manager-focused dashboards
- advanced analytics and AI-driven insights
- deeper recruitment intelligence UX
- real-time notification UX
- usability polish, filters, pagination, and stronger test coverage

## 8) API and Environment
- API base URL: `src/environments/environment.ts`
- Expected local backend URL: `http://localhost:3000/api`

Key backend integrations used by FE:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`
- `POST /api/tenants/onboard`
- `POST /api/employees/invite`
- `GET /api/invitations/resolve`
- `POST /api/invitations/accept`

Email testing behavior (important for QA/UAT):
- If backend is configured with Mailtrap sandbox SMTP, invitation/reset emails appear in Mailtrap inbox, not in real recipient Gmail inbox.
- Frontend invitation and reset flows are still valid in this mode; testers must open links from Mailtrap messages.

## 9) Build and Commands
- `yarn start`
- `yarn build`

## 10) Quick Verification Checklist
- Tenant login with empty company code fails (non-super-admin)
- Tenant login with wrong company code fails
- Tenant login with correct company code succeeds
- Employee invite form shows all 4 roles for company admin
- HR manager invite flow blocks creation of `COMPANY_ADMIN`
- Tenant-protected API calls include matching `X-Tenant-ID`

## 11) Canonical Reference Docs
For deeper detail (optional), see:
- `../docs/ARCHITECTURE.md`
- `../docs/PROJECT_STATUS.md`
- `../docs/RBAC_PERMISSION_MATRIX.md`
- `../docs/SETUP_STEPS.md`

## 12) Operational Rules (Latest)
These are enforced UX behaviors and should not be regressed:

- Public auth/signup UX:
	- `/signup` is public and submits to `POST /api/auth/signup`.
	- Login page links to signup route.

- Tenant/lead status wording:
	- Pending lead rows must appear in approvable sections (not archived/deleted sections).
	- Use friendly labels:
		- `Pending Approval`
		- `Suspended - Payment Due`
	- Keep user-friendly status labels across tenants, leads, invitations, and company payments pages.

- Leave and attendance identity rendering:
	- For approval/list views, render clear employee identity using first name + unique email.
	- Attendance page must use fallback employee directory mapping when nested user data is missing.
	- Name display is first-name focused (avoid role-like suffixes in display text).

- HR Manager/Team Lead workflow UX:
	- `HR_MANAGER` must see Leave and Attendance navigation.
	- Leave approvals available for `COMPANY_ADMIN`, `HR_MANAGER`, and `TEAM_LEAD` (with backend scope checks).

- Employee delete UX guard:
	- In employee table, delete action for `COMPANY_ADMIN` targets is disabled for company admin users.
	- Tooltip/message must clearly state only super admin can delete company admin users.
