# Frontend: Invite Employee with Role Selector - Implementation Guide

**Framework:** Angular  
**Component Location:** `src/app/pages/employees/invite-modal/invite-modal.component.ts`

---

## Quick UI Mockup (Match BRD Style)

```
┌──────────────────────────────────────────┐
│   Invite Employee to Company             │
├──────────────────────────────────────────┤
│                                          │
│  Full Name *                             │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
│  Email *                                 │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
│  Department *                            │
│  ┌──────────────────────────────────────┐│
│  │ [Dropdown ▼]                         ││
│  └──────────────────────────────────────┘│
│                                          │
│  Designation *                           │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
│  Role * (NEW!)                           │
│  ┌─ EMPLOYEE ───────────────────────────┐│
│  │ Self-service user. View leave,       ││
│  │ payslips, attendance. Cannot approve.││
│  └──────────────────────────────────────┘│
│  ┌─ TEAM LEAD ───────────────────────────┐│
│  │ Approves leave for direct reports.   ││
│  │ Views team attendance & reports.     ││
│  └──────────────────────────────────────┘│
│  ┌─ HR MANAGER ──────────────────────────┐│
│  │ Full HR operations. Approves all     ││
│  │ leave (tenant-wide). Manages         ││
│  │ recruitment, policies, attendance.   ││
│  └──────────────────────────────────────┘│
│  ┌─ COMPANY ADMIN ───────────────────────┐│
│  │ Full access. Manages users, config,  ││
│  │ payroll, settings. (Disabled for     ││
│  │ HR_MANAGER users)                    ││
│  └──────────────────────────────────────┘│
│                                          │
│  [ Cancel ]  [ Send Invite ]             │
│                                          │
└──────────────────────────────────────────┘
```

---

## Step 1: Update Component TypeScript

**File:** `src/app/pages/employees/invite-employee/invite-employee.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeesService } from '../../../core/services/employees.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-invite-employee',
  templateUrl: './invite-employee.component.html',
  styleUrls: ['./invite-employee.component.scss'],
})
export class InviteEmployeeComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Role options with descriptions
  roleOptions = [
    {
      value: 'EMPLOYEE',
      label: 'Employee',
      description: 'Self-service user. Can request leave, view payslips, update personal details.',
      icon: '👤',
    },
    {
      value: 'TEAM_LEAD',
      label: 'Team Lead',
      description: 'Approves leave requests from direct reports. Views team attendance and reports.',
      icon: '👥',
    },
    {
      value: 'HR_MANAGER',
      label: 'HR Manager',
      description: 'Full HR operations. Approves all leave (tenant-wide). Manages policies and recruitment.',
      icon: '📋',
    },
    {
      value: 'COMPANY_ADMIN',
      label: 'Company Admin',
      description: 'Full access. Manages users, configuration, payroll, and company settings.',
      icon: '⚙️',
    },
  ];

  departments = ['Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations', 'Marketing'];

  constructor(
    private fb: FormBuilder,
    private employeesService: EmployeesService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkUserRole();
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      workEmail: ['', [Validators.required, Validators.email]],
      department: ['', Validators.required],
      designation: ['', [Validators.required, Validators.minLength(2)]],
      role: ['EMPLOYEE', Validators.required], // Default to EMPLOYEE
      employeeCode: [''],
    });
  }

  checkUserRole(): void {
    // If current user is HR_MANAGER, disable COMPANY_ADMIN option
    const userRoles = this.auth.getUserRoles();
    if (userRoles.includes('HR_MANAGER') && !userRoles.includes('COMPANY_ADMIN')) {
      // Filter out COMPANY_ADMIN from options
      this.roleOptions = this.roleOptions.filter((r) => r.value !== 'COMPANY_ADMIN');
    }
  }

  getAvailableRoles() {
    return this.roleOptions;
  }

  submitForm(): void {
    if (!this.form.valid) {
      this.showMessage('Please fill all required fields correctly.', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    const payload = {
      name: this.form.value.name,
      workEmail: this.form.value.workEmail,
      department: this.form.value.department,
      designation: this.form.value.designation,
      role: this.form.value.role,
      employeeCode: this.form.value.employeeCode || undefined,
    };

    this.employeesService.inviteEmployee(payload).subscribe({
      next: (response) => {
        this.showMessage(
          `✅ Invite sent to ${response.email}. Temporary password: ${response.temporaryPassword}`,
          'success',
        );
        this.form.reset();
        // Emit event to parent to refresh employee list
        setTimeout(() => this.closeModal(), 2000);
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to invite employee.', 'error');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
  }

  closeModal(): void {
    // Close modal (emit or navigate)
  }
}
```

---

## Step 2: Update Component HTML Template

**File:** `src/app/pages/employees/invite-employee/invite-employee.component.html`

```html
<div class="modal-backdrop" *ngIf="visible">
  <div class="modal-card">
    <div class="modal-header">
      <h2>Invite Employee to Company</h2>
      <button type="button" class="close-btn" (click)="closeModal()">✕</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="submitForm()" class="form">
      <!-- Message Alert -->
      <div *ngIf="message" [class.alert-success]="messageType === 'success'" [class.alert-error]="messageType === 'error'"
        class="alert">
        {{ message }}
      </div>

      <!-- Full Name -->
      <div class="form-group">
        <label for="name">Full Name *</label>
        <input 
          id="name" 
          type="text" 
          formControlName="name" 
          placeholder="e.g., John Smith"
          class="form-input"
        />
        <small *ngIf="form.get('name')?.hasError('required')" class="error">
          Full name is required.
        </small>
      </div>

      <!-- Email -->
      <div class="form-group">
        <label for="workEmail">Work Email *</label>
        <input 
          id="workEmail" 
          type="email" 
          formControlName="workEmail" 
          placeholder="john.smith@company.com"
          class="form-input"
        />
        <small *ngIf="form.get('workEmail')?.hasError('email')" class="error">
          Please enter a valid email.
        </small>
      </div>

      <!-- Department -->
      <div class="form-group">
        <label for="department">Department *</label>
        <select 
          id="department" 
          formControlName="department" 
          class="form-input"
        >
          <option value="">Select Department</option>
          <option *ngFor="let dept of departments" [value]="dept">{{ dept }}</option>
        </select>
      </div>

      <!-- Designation -->
      <div class="form-group">
        <label for="designation">Designation *</label>
        <input 
          id="designation" 
          type="text" 
          formControlName="designation" 
          placeholder="e.g., Senior Engineer"
          class="form-input"
        />
      </div>

      <!-- Role Selection (NEW!) -->
      <div class="form-group">
        <label>Role * </label>
        <p class="form-hint">Select the role for this user. Roles define what actions they can perform.</p>
        
        <div class="role-selector">
          <div 
            *ngFor="let role of getAvailableRoles()" 
            class="role-card"
            [class.selected]="form.get('role')?.value === role.value"
            (click)="form.get('role')?.setValue(role.value)"
          >
            <div class="role-card-header">
              <span class="role-icon">{{ role.icon }}</span>
              <span class="role-label">{{ role.label }}</span>
              <input 
                type="radio" 
                [value]="role.value" 
                formControlName="role"
                class="role-radio"
              />
            </div>
            <p class="role-description">{{ role.description }}</p>
          </div>
        </div>
      </div>

      <!-- Employee Code (Optional) -->
      <div class="form-group">
        <label for="employeeCode">Employee Code (Optional)</label>
        <input 
          id="employeeCode" 
          type="text" 
          formControlName="employeeCode" 
          placeholder="e.g., EMP-001"
          class="form-input"
        />
      </div>

      <!-- Buttons -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="closeModal()" [disabled]="loading">
          Cancel
        </button>
        <button 
          type="submit" 
          class="btn btn-primary" 
          [disabled]="!form.valid || loading"
        >
          {{ loading ? 'Sending Invite...' : 'Send Invite' }}
        </button>
      </div>
    </form>
  </div>
</div>
```

---

## Step 3: Add Styling (SCSS)

**File:** `src/app/pages/employees/invite-employee/invite-employee.component.scss`

```scss
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;

    &:hover {
      color: #111;
    }
  }
}

.form {
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #111;
    font-size: 14px;
  }

  .form-hint {
    margin: -8px 0 12px;
    font-size: 13px;
    color: #6b7280;
  }
}

.form-input,
.form-input select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
}

.error {
  display: block;
  margin-top: 4px;
  color: #dc2626;
  font-size: 12px;
}

.alert {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;

  &.alert-success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }

  &.alert-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }
}

/* Role Selector Styles */
.role-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }

  &.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }
}

.role-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  .role-icon {
    font-size: 24px;
  }

  .role-label {
    font-weight: 600;
    color: #111;
    flex: 1;
  }

  .role-radio {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
}

.role-description {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
  }
}

.btn-secondary {
  background: #e5e7eb;
  color: #111;

  &:hover:not(:disabled) {
    background: #d1d5db;
  }
}
```

---

## Step 4: Update Employees Service

**File:** `src/app/core/services/employees.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private readonly http: HttpClient) {}

  getAll() {
    return this.http.get(`${environment.apiUrl}/employees`);
  }

  getById(id: number) {
    return this.http.get(`${environment.apiUrl}/employees/${id}`);
  }

  // NEW: Invite employee with role
  inviteEmployee(dto: {
    name: string;
    workEmail: string;
    department: string;
    designation: string;
    role: 'EMPLOYEE' | 'TEAM_LEAD' | 'HR_MANAGER' | 'COMPANY_ADMIN';
    employeeCode?: string;
  }) {
    return this.http.post(`${environment.apiUrl}/employees/invite`, dto);
  }

  update(id: number, dto: any) {
    return this.http.patch(`${environment.apiUrl}/employees/${id}`, dto);
  }

  delete(id: number) {
    return this.http.delete(`${environment.apiUrl}/employees/${id}`);
  }

  anonymize(id: number) {
    return this.http.delete(`${environment.apiUrl}/employees/${id}/anonymize`);
  }

  exportData(id: number) {
    return this.http.get(`${environment.apiUrl}/employees/${id}/export-data`);
  }
}
```

---

## Step 5: Update Auth Service (Check User Roles)

**File:** `src/app/core/services/auth.service.ts`

```typescript
export class AuthService {
  // ... existing code ...

  getUserRoles(): string[] {
    const userClaims = this.getDecodedToken();
    return userClaims?.roles || [];
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  isCompanyAdmin(): boolean {
    return this.hasRole('COMPANY_ADMIN');
  }

  isHRManager(): boolean {
    return this.hasRole('HR_MANAGER');
  }
}
```

---

## Integration: Add to Employees Page

**File:** `src/app/pages/employees/employees-page.component.ts`

```typescript
export class EmployeesPageComponent {
  showInviteModal = false;

  openInviteModal(): void {
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    // Refresh employee list
    this.loadEmployees();
  }
}
```

**Template:**

```html
<button (click)="openInviteModal()" class="btn btn-primary">
  + Invite Employee
</button>

<app-invite-employee 
  [visible]="showInviteModal"
  (close)="closeInviteModal()"
></app-invite-employee>
```

---

## API Call Example

```bash
curl -X POST "http://localhost:3000/api/employees/invite" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Tenant-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Wilson",
    "workEmail": "sarah@company.com",
    "department": "Human Resources",
    "designation": "HR Manager",
    "role": "HR_MANAGER"
  }'
```

**Response (201):**
```json
{
  "email": "sarah@company.com",
  "status": "ACTIVE",
  "firstName": "Sarah",
  "lastName": "Wilson",
  "assignedRole": "HR_MANAGER",
  "temporaryPassword": "admin@123",
  "requiresPasswordChange": true
}
```

---

## Testing Checklist

- [ ] Company Admin can open "Invite Employee" modal
- [ ] All 4 role options display with descriptions
- [ ] Selecting role highlights it
- [ ] Form validation works (email, required fields)
- [ ] Submit creates user with correct role
- [ ] Email sent with temporary password
- [ ] HR_Manager cannot see COMPANY_ADMIN option
- [ ] New user can login with temporary password
- [ ] New user has correct permissions

---

## What Users Can Now Do

| Role | After Invite | Can Do |
|------|---|---|
| **EMPLOYEE** | Login + password reset | Request leave, view own data |
| **TEAM_LEAD** | Login + password reset | Approve team leave, view team attendance |
| **HR_MANAGER** | Login + password reset | Full HR ops (approvals, policies, reports) |
| **COMPANY_ADMIN** | Login + password reset | Full tenant admin access |

---

**Ready for Frontend Implementation!** ✅
