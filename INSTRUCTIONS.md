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
- Organisation page (BRD 6.3): Tree/Locations/Departments/Teams tabs + create forms — see Section 12 for step-by-step status
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
| 8 | Department manager picker | ⏳ Next | after employee FK wiring |

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
	- `HR_MANAGER` must see Leave and Attendance navigation.
	- Leave approvals available for `COMPANY_ADMIN`, `HR_MANAGER`, and `TEAM_LEAD` (with backend scope checks).

- Employee delete UX guard:
	- In employee table, delete action for `COMPANY_ADMIN` targets is disabled for company admin users.
	- Tooltip/message must clearly state only super admin can delete company admin users.
