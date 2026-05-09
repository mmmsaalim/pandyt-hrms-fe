# FE Instructions (FlowHR)

## Stack
- Angular standalone components
- Router + HttpClient interceptor for JWT

## Core App Flows

### Login
- Page: `/login`
- Calls `POST /api/auth/login`
- Stores access token in local storage
- Routes to dashboard on success

### Super Admin: Create Company
- Dashboard action routes to `/tenants?new=1`
- Tenants page uses inline form (no popup)
- Form fields:
  - company name
  - admin name
  - admin email
  - subscription plan
  - seats (optional)
- API call: `POST /api/tenants/onboard`
- Result: invitation sent to company admin

### Company Admin: Invite Employee
- Dashboard action routes to `/employees?new=1`
- Employees page uses inline form (no popup)
- Form fields:
  - name
  - work email
  - department
  - designation
  - role
  - employee code (optional)
- API call: `POST /api/employees/invite`
- Result: invitation sent to employee

### Invitation Acceptance
- Invitation landing page: `/accept-invitation?token=...`
  - resolves token via `GET /api/invitations/resolve`
- Set password page: `/set-password?token=...`
  - submits via `POST /api/invitations/accept`

## Services
- `core/services/tenants.service.ts`
  - `list()`
  - `onboardCompany()`
- `core/services/employees.service.ts`
  - `list()`
  - `inviteEmployee()`
- `core/services/invitations.service.ts`
  - `resolve()`
  - `accept()`

## Routing Notes
Public routes (no auth guard):
- `/login`
- `/accept-invitation`
- `/set-password`

Authenticated app routes remain under main layout.

## Build and Run
- `yarn start`
- `yarn build`

## API Base URL
- from `src/environments/environment.ts`
- expected: `http://localhost:3000/api`
