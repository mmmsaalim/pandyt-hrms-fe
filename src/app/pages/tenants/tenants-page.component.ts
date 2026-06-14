import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../core/services/tenants.service';
import { ActivatedRoute } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ConfirmDialogComponent, EditDialogShellComponent, CommonModule, DatePipe],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
})
export class TenantsPageComponent implements OnInit {
  rows: any[] = [];
  showCreateForm = false;
  creating = false;
  mutatingTenantId: number | null = null;
  errorMessage = '';
  successMessage = '';
  createdCompanyCode = '';
  tenantEditBusy = false;
  editingTenantId: number | null = null;
  editTenantForm = {
    name: '',
    companyCode: '',
    plan: '',
    seats: 1,
  };
  confirmBusy = false;
  confirmDialog: {
    mode: 'approve' | 'delete';
    tenant: any;
    title: string;
    message: string;
    detail: string;
    confirmText: string;
    tone: 'primary' | 'danger';
  } | null = null;
  form = {
    companyName: '',
    companyCode: '',
    adminName: '',
    adminEmail: '',
    subscriptionPlan: 'BASIC',
    seats: 25,
  };

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.showCreateForm = params.get('new') === '1';
      const id = params.get('id');
      if (id) {
        this.loadRows(() => {
          const tenant = this.rows.find(r => r.id === Number(id));
          if (tenant) {
            this.editTenant(tenant);
          }
        });
      } else {
        this.loadRows();
      }
    });
  }

  loadRows(callback?: () => void): void {
    this.tenantsService.list().subscribe((res: any) => {
      this.rows = res;
      if (callback) callback();
    });
  }

  get activeRows(): any[] {
    return this.rows.filter((row) => row.leadStatus === 'PENDING' || row.status === 'ACTIVE');
  }

  get archivedRows(): any[] {
    return this.rows.filter((row) => row.leadStatus === 'DELETED' || (row.status === 'SUSPENDED' && row.leadStatus !== 'PENDING'));
  }

  private friendlyStatus(value: string): string {
    switch (value) {
      case 'ACTIVE':
        return 'Active';
      case 'PENDING':
        return 'Pending';
      case 'INACTIVE':
        return 'Inactive';
      case 'CONVERTED':
        return 'Approved';
      case 'DELETED':
        return 'Deleted';
      case 'SUSPENDED':
        return 'Suspended';
      default:
        return value;
    }
  }

  leadStatusLabel(leadStatus: string): string {
    return this.friendlyStatus(leadStatus);
  }

  tenantStatusLabel(row: { status: string; leadStatus: string }): string {
    if (row.leadStatus === 'PENDING') {
      return 'Pending Approval';
    }

    if (row.status === 'SUSPENDED' && row.leadStatus === 'CONVERTED') {
      return 'Suspended - Payment Due';
    }

    return this.friendlyStatus(row.status);
  }

  adminStatusLabel(status?: string): string {
    if (!status) {
      return '-';
    }

    return this.friendlyStatus(status);
  }

  isBusy(id: number): boolean {
    return this.mutatingTenantId === id;
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.createdCompanyCode = '';
    this.showCreateForm = true;
  }

  private async copyText(value: string): Promise<boolean> {
    if (!value) {
      return false;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }

  async copyCompanyCode(code: string): Promise<void> {
    const copied = await this.copyText(code);
    if (copied) {
      this.successMessage = `Company code copied: ${code}`;
      this.errorMessage = '';
      return;
    }

    this.errorMessage = 'Unable to copy company code. Please copy manually.';
  }

  createTenant(): void {
    if (!this.form.companyName.trim() || !this.form.adminName.trim() || !this.form.adminEmail.trim()) {
      this.errorMessage = 'Company name, admin name, and admin email are required.';
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.createdCompanyCode = '';

    this.tenantsService
      .onboardCompany({
        companyName: this.form.companyName.trim(),
        companyCode: this.form.companyCode.trim() || undefined,
        adminName: this.form.adminName.trim(),
        adminEmail: this.form.adminEmail.trim(),
        subscriptionPlan: this.form.subscriptionPlan.trim() || 'BASIC',
        seats: Number(this.form.seats) || 1,
      })
      .subscribe({
        next: (res: any) => {
          const createdCode = res?.tenant?.companyCode || '';
          this.form = {
            companyName: '',
            companyCode: '',
            adminName: '',
            adminEmail: '',
            subscriptionPlan: 'BASIC',
            seats: 25,
          };
          this.showCreateForm = false;
          this.createdCompanyCode = createdCode;
          this.successMessage = `Tenant created for ${res?.adminUser?.email || 'company admin'}. An onboarding email with a password setup link has been sent. Super admin approval is still required before login.`;
          this.loadRows();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create tenant.';
          this.creating = false;
        },
        complete: () => {
          this.creating = false;
        },
      });
  }

  approveTenant(row: any): void {
    this.confirmDialog = {
      mode: 'approve',
      tenant: row,
      title: 'Approve tenant and sync access?',
      message: `Approve ${row?.name}? Tenant admin accounts will be activated and access will be synced.`,
      detail: 'After approval, tenant users can sign in normally.',
      confirmText: 'Approve / Sync',
      tone: 'primary',
    };
  }

  private runApproveTenant(row: any): void {
    this.mutatingTenantId = row.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.approveTenant(row.id).subscribe({
      next: () => {
        this.successMessage = `${row.name} approved and access synced. Tenant admin can now log in.`;
        this.confirmDialog = null;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to approve tenant.';
      },
      complete: () => {
        this.mutatingTenantId = null;
        this.confirmBusy = false;
      },
    });
  }

  editTenant(row: any): void {
    this.editingTenantId = row.id;
    this.tenantEditBusy = false;
    this.editTenantForm = {
      name: row?.name ?? '',
      companyCode: row?.companyCode ?? '',
      plan: row?.plan ?? '',
      seats: Number(row?.seats ?? 1),
    };
  }

  closeTenantEditDialog(): void {
    if (this.tenantEditBusy) {
      return;
    }

    this.editingTenantId = null;
  }

  submitTenantEdit(): void {
    if (this.editingTenantId === null) {
      return;
    }

    const nextSeats = Number(this.editTenantForm.seats);
    if (!Number.isFinite(nextSeats) || nextSeats < 1) {
      this.errorMessage = 'Seats must be a valid number greater than 0.';
      return;
    }

    this.mutatingTenantId = this.editingTenantId;
    this.tenantEditBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService
      .updateTenant(this.editingTenantId, {
        name: this.editTenantForm.name.trim(),
        companyCode: this.editTenantForm.companyCode.trim() || undefined,
        plan: this.editTenantForm.plan.trim(),
        seats: Math.floor(nextSeats),
      })
      .subscribe({
        next: () => {
          this.successMessage = `${this.editTenantForm.name || 'Tenant'} updated successfully.`;
          this.editingTenantId = null;
          this.loadRows();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update tenant.';
        },
        complete: () => {
          this.mutatingTenantId = null;
          this.tenantEditBusy = false;
        },
      });
  }

  deleteTenant(row: any): void {
    this.confirmDialog = {
      mode: 'delete',
      tenant: row,
      title: 'Delete tenant?',
      message: `Delete ${row?.name}? This action suspends the tenant and marks lead status as deleted.`,
      detail: 'Suspended tenant users cannot sign in.',
      confirmText: 'Delete tenant',
      tone: 'danger',
    };
  }

  closeConfirmDialog(): void {
    if (this.confirmBusy) {
      return;
    }

    this.confirmDialog = null;
  }

  confirmAction(): void {
    if (!this.confirmDialog) {
      return;
    }

    this.confirmBusy = true;
    const row = this.confirmDialog.tenant;

    if (this.confirmDialog.mode === 'approve') {
      this.runApproveTenant(row);
      return;
    }

    this.mutatingTenantId = row.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.deleteTenant(row.id).subscribe({
      next: () => {
        this.successMessage = `${row.name} deleted successfully. Tenant users are now suspended from sign-in.`;
        this.confirmDialog = null;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete tenant.';
      },
      complete: () => {
        this.mutatingTenantId = null;
        this.confirmBusy = false;
      },
    });
  }
}
