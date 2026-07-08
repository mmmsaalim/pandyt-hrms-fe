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
- `src/app/core/services` - API service layer (auth, tenants, employees, tenant-configuration, role-configuration, etc.)
- `src/app/shared/layout` - shell layout
- `src/app/shared/sidebar` - role-aware navigation
- `src/app/shared/topbar` - user/top navigation
- `src/app/pages/auth` - login and invitation acceptance flows
- `src/app/pages/dashboard` - role-based dashboard views
- `src/app/pages/tenants` - super admin tenant onboarding + **Configure Tenant** wizard
- `src/app/pages/platform-catalog` - super admin platform module/field catalog UI
- `src/app/pages/configuration` - company admin Users & Permissions + Access Configuration
- `src/app/pages/cross-tenant-reports` - super admin cross-tenant reporting UI
- `src/app/pages/employees` - employee list, invite, salary update, export
- `src/app/pages/leave` - request, approval, balances, policies
- `src/app/pages/attendance` - clock-in/out and overrides
- `src/app/pages/payroll` - run creation and processing
- `src/app/pages/payslips` - payslip views
- `src/app/pages/organisation` - org tree and CRUD forms
- `src/app/pages/recruitment` - ATS screens
- `src/app/pages/reports` - reporting screens
- `src/app/pages/cross-tenant-reports` - super admin cross-tenant reporting UI
- `src/environments/environment.ts` - API base URL config

## 4) Role Model (Current)
- `SUPER_ADMIN`: tenant lifecycle UX + **tenant-wise configuration** (`/tenants`, `/platform/catalog`)
- `COMPANY_ADMIN`: full tenant operations UX + **user module role assignment** (`/configuration/*`)
- `HR_MANAGER`: HR job role UX; **sidebar/routes gated by assigned module permissions**, not title alone
- `TEAM_LEAD`: team job role UX; **module access via assigned tenant module roles**
- `EMPLOYEE`: self-service UX; **module access via assigned tenant module roles**

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
- **Super Admin tenant configuration**: Configure Tenant modal (plan, modules, custom fields) on `/tenants`; platform catalog on `/platform/catalog`
- **Company Admin RBAC**: `/configuration/users-permissions` (assign module roles per user), `/configuration/access-configuration` (permission matrix per tenant role)
- **Runtime gating**: sidebar + routes use `auth.hasModule()` (tenant enabled modules) and `auth.hasAnyPermission()` (user effective permissions from login)
- **Dynamic employee fields**: employee form renders enabled custom fields from `auth.getModuleFields('employees')`
- Employee invite and management UI (`/employees?new=1`)
- Invite role support in UI: `EMPLOYEE | TEAM_LEAD | HR_MANAGER | COMPANY_ADMIN`
- Leave request and approval UX + balances/policies
- Attendance clock-in/out and admin override UX
- Payroll run create/process UX
- Payslip statutory columns UX
- Organisation page (BRD 6.3): Tree/Locations/Departments/Teams tabs + create forms — see Section 12 for step-by-step status
- Cross-Tenant Reports (Super Admin): Leave, Attendance, and Payroll summaries across all or selected tenants.
- Reports and recruitment pages connected to backend APIs

## 13) Recruitment / ATS — BRD 6.6 (HR Manager Focus)

Active implementation target. Read before touching `pages/recruitment`.

### 13.1 Who Sees This Page

| Role | Route `/recruitment` | Manage jobs/candidates |
|------|---------------------|------------------------|
| HR_MANAGER | ✅ Yes | ✅ Yes |
| COMPANY_ADMIN | ✅ Yes | ✅ Yes |
| TEAM_LEAD | ❌ Hidden | — |
| EMPLOYEE | ❌ Hidden | — |

### 13.2 Page Layout (3 Tabs)

1. **Job Posts** — create/edit/delete openings (title, department, description, status)
2. **Candidates** — add candidates, filter by job, upload CV (stored only — no AI yet)
3. **Pipeline** — kanban-style columns by stage; move candidates between stages

### 13.3 API (`recruitment.service.ts`)

- `listJobs`, `createJob`, `updateJob`, `deleteJob`
- `listCandidates`, `createCandidate`, `updateCandidate`, `deleteCandidate`
- `uploadResume(candidateId, file)` — FormData POST
- `publicOpenJobs(companyCode)`, `publicApply(companyCode, jobId, dto, resume)` for external applicants
- Resume file URL: `fileBase + candidate.resumeUrl` (served from BE `/uploads/`)

### 13.4 HR Manager Workflow

1. Login with company code as HR_MANAGER
2. Open **Recruitment** in sidebar
3. **Job Posts** → Post Job → set status OPEN
4. **Candidates** → Add Candidate → link to job
5. Upload CV (PDF/DOCX) — file stored, AI parsing message shown
6. **Pipeline** → move candidate through stages

### 13.5 Implementation Status

| Step | Task | Status |
|------|------|--------|
| 1 | Route + sidebar for HR_MANAGER | ✅ Done |
| 2 | Jobs tab CRUD | ✅ Done |
| 3 | Candidates tab + CV upload stub | ✅ Done |
| 4 | Pipeline board | ✅ Done |
| 5 | Public careers page `/careers/:companyCode` | ✅ Done |
| 6 | AI match % badge / parsing | ⏳ Phase 3 |

---

## 14) Super Admin Tenant Configuration (Tenant-Wise Setup)

This section documents Super Admin and Company Admin configuration UX. Read before touching `pages/tenants`, `pages/platform-catalog`, `pages/configuration`, or `core/services/auth.service.ts`.

### 14.1 Two Configuration Planes (Do Not Mix)

| Plane | Who | Route(s) | Purpose |
|-------|-----|----------|---------|
| **Tenant setup** | Super Admin | `/tenants`, `/platform/catalog` | Enable modules/fields per tenant; manage global catalog |
| **User permissions** | Company Admin | `/configuration/users-permissions`, `/configuration/access-configuration` | Assign module roles to users; edit permission matrix |

Company Admin must **not** get UI to toggle tenant modules — only Super Admin does.

### 14.2 Super Admin UX

**Tenants page (`/tenants`)**
- Create tenant (plan, seats, admin invite)
- Create tenant also captures billing contact emails and initial organisation setup (locations, departments, teams) so the new company admin does not start with empty department/team dropdowns.
- Sri Lanka defaults are implicit: `en-LK`, `LKR`, April fiscal year, and the standard LKR payslip template. Do not show those as onboarding fields for the current Sri Lanka-only product.
- Company code is shown for login/reference only. Do not add "Copy company code" buttons back to tenant tables or onboarding success messages.
- **Configure Tenant** modal per active tenant:
  - Subscription plan dropdown (applies preset defaults to module checkboxes)
  - Included seats from the selected plan
  - Module checkboxes (Employees, Organisation, Leave, Attendance, …)
  - Per-module custom field toggles (enabled / required) — e.g. Religion, NIC on Employees
- Save → `PUT /api/tenants/:id/configuration`

**Platform Catalog (`/platform/catalog`)**
- Add modules and fields to the global catalog (Super Admin only)
- APIs via `tenant-configuration.service.ts`

Sidebar (Super Admin): Dashboard, Tenants, Leads, Company Payments, Platform Reports; Configuration group → Subscription & Billing, Invitations.

**Core HR tools (included on all plans)**
- Invitations, HR Letters, and Team Feedback are always available — they are **not** subscription module toggles.
- Dashboard → **People tools** panel links to `/letters` and `/feedback` for Company Admin, HR Manager, and Team Lead.
- Invitations live under the **Configuration** sidebar group (not main nav).
- Company Admin can list and submit team feedback (`GET`/`POST /api/feedback`).

### 14.3 Company Admin Configuration UX

**Users & Permissions tab**
- Lists tenant users with assigned module role chips (`EMPLOYEES`, `LEAVE`, …)
- **Edit Access** modal: checkboxes for enabled tenant module roles only (filtered by `auth.getEnabledModules()`)
- Auto-bootstraps tenant module roles on first load if missing (`POST /api/roles/tenant/bootstrap-modules`)

**Access Configuration tab**
- Edit permission checkboxes for tenant-scoped roles

Configuration sidebar group auto-expands for Company Admin and for HR Managers with invitation access.

**Core HR tools (included on all plans)**
- Invitations, HR Letters, Team Feedback — shown as chips on tenant onboarding; not gated by `enabledModules`.
- Main sidebar no longer lists Letters, Feedback, or Invitations; use Dashboard people tools or Configuration → Invitations.

### 14.4 Auth Session Fields (Login Response)

Stored in `AuthService` user signal / localStorage:

- `enabledModules` — tenant-level modules (Super Admin configured)
- `effectivePermissions` — user permissions after tenant module filter
- `tenantConfig.fields` — dynamic field definitions per module

Key helpers in `auth.service.ts`:
- `hasModule(key)` — tenant module enabled (Super Admin plane)
- `hasAnyPermission([...])` — user permission check (Company Admin assignment plane)
- `getModuleFields(moduleKey)` — enabled custom fields for forms

### 14.5 Navigation and Route Gating

**Sidebar (`sidebar.component.ts`)**
- Business menu items require `auth.hasModule('<module>')` **and** relevant `auth.hasAnyPermission(...)`
- Leave / Attendance / Recruitment do **not** bypass checks for `HR_MANAGER` job role alone

**Routes (`app.routes.ts`)**
- `roleGuard` checks `roles`, `permissions`, and `module` data together
- Example: `/attendance` requires `attendance.read` + module `attendance`

**Employees page**
- Loads organisation APIs only when `auth.hasModule('organisation')`
- Renders custom employee fields from tenant config
- Employee profile page opens in read-only mode. Users click "Edit profile" to update enabled personal/custom fields; HR-owned fields like department, team, role, status, and salary remain read-only there.

### 14.6 API Integration

`tenant-configuration.service.ts` (Super Admin):
- `getTenantConfiguration(tenantId)`, `saveTenantConfiguration(tenantId, dto)`
- `listPlatformModules()`, `createPlatformModule()`, field CRUD

`role-configuration.service.ts` (Company Admin):
- `getConfiguration()`, assign/unassign scoped roles, set role permissions

### 14.7 Implementation Status

| Step | Task | Status | Files |
|------|------|--------|-------|
| 1 | Configure Tenant modal on `/tenants` | ✅ Done | `pages/tenants/*` |
| 2 | Platform catalog page | ✅ Done | `pages/platform-catalog/*` |
| 3 | Auth helpers + login fields | ✅ Done | `core/services/auth.service.ts` |
| 4 | Sidebar/route module gating | ✅ Done | `sidebar.component.ts`, `app.routes.ts` |
| 5 | Company Admin Users & Permissions | ✅ Done | `pages/configuration/*` |
| 6 | Dynamic employee custom fields | ✅ Done | `pages/employees/*` |
| 7 | HR_MANAGER nav by permissions not title | ✅ Done | `sidebar.component.ts`, attendance/leave/recruitment pages |

### 14.8 Rules for AI Agents

1. Super Admin changes tenant modules on `/tenants` — not on `/configuration`.
2. Company Admin assigns **tenant module roles** to users — do not reintroduce HR_MANAGER auto-access to all modules.
3. After permission or tenant config changes, users must **re-login** to refresh JWT/session fields.
4. Use `effectivePermissions` for module action buttons (approve leave, override attendance, manage recruitment, etc.).
5. Match existing card/modal patterns on tenants and configuration pages.

### 14.10 Tenant lifecycle UX (`/tenants`)

| Button | When shown | Effect |
|--------|------------|--------|
| **Deactivate** | Active + approved tenant | Payment suspension (`SUSPENDED` + `CONVERTED`) |
| **Archive** | Active or pending tenant | Soft archive (`SUSPENDED` + `DELETED`), reactivatable |
| **Reactivate** | Suspended / archived table | Restore to `ACTIVE` |

**Configure Tenant modal** uses `edit-dialog-shell` with `size="large"` — scrollable body, sticky Save/Cancel footer (long module/field lists).

Archived table shows **Reactivate** + **Configure**. Login error text is returned from BE and shown on the login form.

### 14.11 Quick Verification

1. Super Admin → Tenants → Configure Tenant → enable/disable modules as needed → Save.
2. Company Admin login → sidebar shows only modules enabled for the tenant.
3. Configuration → Users & Permissions → assign only the module roles that user should have → Save.
4. That user re-login → sidebar/routes match assigned module roles only (same rule for every module).
5. Super Admin → Platform Catalog → add field → Configure Tenant → enable field → Company Admin employee form shows it.

---

## 7) Next Scope (Planned)
Planned next roadmap items:
- richer manager-focused dashboards
- advanced analytics and AI-driven insights
- deeper recruitment intelligence UX (AI parsing — Phase 3)
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
- Super Admin can save tenant config with modules beyond plan preset (plan applies defaults only)
- User without a tenant module role does not see that module in sidebar after re-login (same config rule for all modules)

## 11) Canonical Reference Docs
For deeper detail (optional), see:
- `../docs/ARCHITECTURE.md`
- `../docs/PROJECT_STATUS.md`
- `../docs/RBAC_PERMISSION_MATRIX.md`
- `../docs/SETUP_STEPS.md`

## 12) Organisation Structure — BRD 6.3 (Company Admin Focus)

This section is the **active implementation target**. Read this before touching `pages/organisation` or `core/services/organisation.service.ts`.

### 12.1 Who Sees This Page

| Role | Route `/organisation` | Create buttons | Notes |
|------|----------------------|----------------|-------|
| COMPANY_ADMIN | ✅ Yes | ✅ Yes | Primary org structure owner (BRD 4.1) |
| HR_MANAGER | ❌ Hidden | — | Backend allows write; FE not wired yet |
| TEAM_LEAD | ❌ Hidden | — | — |
| EMPLOYEE | ❌ Hidden | — | — |

Sidebar: Organisation menu shown when `roles.includes('COMPANY_ADMIN')`.

### 12.2 Page Layout (4 Tabs)

1. **Tree** — visual hierarchy: Location → Department → Team (with employee count badge)
2. **Locations** — table + "Add Location" form (name, address)
3. **Departments** — table + "Add Department" form (name, location dropdown)
4. **Teams** — table + "Add Team" form (name, department dropdown — required)

Recommended setup order for a new tenant:
`Location` → `Department` (pick location) → `Team` (pick department) → assign employees (step 7, not yet in UI)

### 12.3 API Integration (`organisation.service.ts`)

Currently wired:
- `GET /organisation/tree`
- `GET/POST /organisation/locations`
- `GET/POST /organisation/departments`
- `GET/POST /organisation/teams`

**Tree response** the UI expects:
```typescript
tree: Array<{
  id: number;
  name: string;           // location name
  departments: Array<{
    id: number;
    name: string;
    teams: Array<{
      id: number;
      name: string;
      _count: { employees: number };
    }>;
  }>;
}>;
```

Also wired in FE service:
- `PATCH /organisation/locations/:id`
- `DELETE /organisation/locations/:id`
- `PATCH /organisation/departments/:id`
- `DELETE /organisation/departments/:id`
- `PATCH /organisation/teams/:id`
- `DELETE /organisation/teams/:id`

### 12.4 Sri Lanka / Multi-Tenant UX Notes

- Each company admin manages **only their tenant's** org structure
- Location names are free text (e.g. "Colombo Head Office", "Kandy Branch") — no global Sri Lanka location list
- Tenant context comes from login `companyCode` + `X-Tenant-ID` header (interceptor handles this)
- Employee invite/provisioning is on `/employees` — org structure is the container employees get assigned to (future step)

### 12.5 Implementation Status (step-by-step)

| Step | Task | Status | Files |
|------|------|--------|-------|
| 1 | Route + role guard for Company Admin | ✅ Done | `app.routes.ts` |
| 2 | Sidebar Organisation link | ✅ Done | `sidebar.component.ts` |
| 3 | 4-tab page shell | ✅ Done | `organisation-page.component.*` |
| 4 | Create location/department/team forms | ✅ Done | same |
| 5 | Tree tab renders location-centric API | ✅ Done | depends on BE `getTree()` shape |
| 6 | Edit/delete actions in tables | ✅ Done | `organisation.service.ts`, `organisation-page.component.*` |
| 7 | Employee form: pick department/team/location | ✅ Done | `employees-page.component.*` |
| 8 | Department manager picker | ✅ Done | `organisation-page.component.*` — employee dropdown in create/edit forms; manager shown in table + tree |

### 12.6 Rules for AI Agents Working on Org UI

1. **Keep `isCompanyAdmin` guard** on all write actions (`*ngIf="isCompanyAdmin"`)
2. **Reload all lists after create** — call `loadAll()` which refreshes tree + 3 tables
3. **Match backend tree shape** — do not change template to department-centric without updating BE
4. **Use existing card/table patterns** — same styles as employees, leave pages
5. **Do not add unrelated modules** — focus org section only per BRD phase plan

### 12.7 Quick Verification (Company Admin)

1. Login with company code (e.g. `tnt1` for seed tenant 1)
2. Navigate to Organisation in sidebar
3. Add Location → Add Department → Add Team
4. Tree tab shows hierarchy with team employee counts (0 until employees linked)
5. Tables on Locations/Departments/Teams tabs list created records

---

## 13) Operational Rules (Latest)
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
	- `HR_MANAGER` and `TEAM_LEAD` see a module in the sidebar **only when** the tenant has it enabled **and** the user is assigned that tenant module role (same rule for Employees, Leave, Attendance, Payroll, etc.).
	- Module actions use `effectivePermissions` (e.g. `leave.manage`, `attendance.read`, `recruitment.manage`) — not the job title alone.

- Employee delete UX guard:
	- In employee table, delete action for `COMPANY_ADMIN` targets is disabled for company admin users.
	- Tooltip/message must clearly state only super admin can delete company admin users.

---

## 15) Recent Additions (BRD Gap-Fill)

### 15.1 Employee Date of Birth
- `dateOfBirth` date input added to Employee edit dialog (`employees-page.component.html`).
- Pre-populated from `employee.dateOfBirth` when editing.
- Sent to `PATCH /api/employees/:id` as optional ISO date string.

### 15.2 Leave Presets — Paternity Removed
- `SRI_LANKA_LEAVE_POLICIES` in `core/constants/leave-presets.ts` no longer includes Paternity.
- Tenant create form (Tenants page) will no longer show Paternity in default leave table.

### 15.3 Dashboard — BRD 6.1 Gap-Fill
Company Admin / HR Manager view now shows:
- KPI cards: Total Employees, Open Positions, Monthly Burn Rate (real LKR), Attendance % (today).
- Leave trends line chart (7-month sparkline using `leaveTrendSeries`).
- Recruitment funnel bar chart (candidates by pipeline stage).
- Recent hires table (last 5 joined employees).
- Pending approvals cards (unchanged).

Employee view now shows:
- Quick actions panel: Request Leave, View Payslip, Clock In/Out, My Profile.
- Team birthdays: colleagues with DOB in next 30 days (requires DOB populated on employee records).
- Upcoming public holidays: next 5 Sri Lanka public holidays.
- Pending approvals (own leave requests).

### 15.4 Organisation — Department Manager
- Department create/edit forms show an employee dropdown for manager assignment.
- Departments table shows manager name column.
- Tree view shows manager chip on department nodes.
- `organisation.service.ts` calls `list()` from `EmployeesService` to populate dropdown.

### 15.5 Attendance Settings
- New **Settings** tab on Attendance page (visible to COMPANY_ADMIN / HR_MANAGER).
- Configure: work start/end time, late arrival grace (minutes) + action, early departure grace + action.
- Saved to `GET/PATCH /api/attendance/settings`.
