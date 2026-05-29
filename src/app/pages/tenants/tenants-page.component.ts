import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../core/services/tenants.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
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
    });

    this.loadRows();
  }

  loadRows(): void {
    this.tenantsService.list().subscribe((res: any) => (this.rows = res));
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
          this.successMessage = `Tenant created for ${res?.adminUser?.email || 'company admin'} with temporary password ${res?.temporaryPassword || 'admin@123'}. Super admin approval is required before login.`;
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
    this.mutatingTenantId = row.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.approveTenant(row.id).subscribe({
      next: () => {
        this.successMessage = `${row.name} approved and access synced. Tenant admin can now log in.`;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to approve tenant.';
      },
      complete: () => {
        this.mutatingTenantId = null;
      },
    });
  }

  editTenant(row: any): void {
    const nextName = window.prompt('Tenant name', row?.name ?? '');
    if (nextName === null) {
      return;
    }

    const nextPlan = window.prompt('Subscription plan', row?.plan ?? '');
    if (nextPlan === null) {
      return;
    }

    const nextCompanyCode = window.prompt('Company code', row?.companyCode ?? '');
    if (nextCompanyCode === null) {
      return;
    }

    const nextSeatsRaw = window.prompt('Seats', String(row?.seats ?? 1));
    if (nextSeatsRaw === null) {
      return;
    }

    const nextSeats = Number(nextSeatsRaw);
    if (!Number.isFinite(nextSeats) || nextSeats < 1) {
      this.errorMessage = 'Seats must be a valid number greater than 0.';
      return;
    }

    this.mutatingTenantId = row.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService
      .updateTenant(row.id, {
        name: nextName.trim(),
        companyCode: nextCompanyCode.trim() || undefined,
        plan: nextPlan.trim(),
        seats: Math.floor(nextSeats),
      })
      .subscribe({
        next: () => {
          this.successMessage = `${row.name} updated successfully.`;
          this.loadRows();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update tenant.';
        },
        complete: () => {
          this.mutatingTenantId = null;
        },
      });
  }

  deleteTenant(row: any): void {
    const confirmed = window.confirm(
      `Delete ${row?.name}? This will suspend the tenant and mark lead status as deleted.`,
    );
    if (!confirmed) {
      return;
    }

    this.mutatingTenantId = row.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.deleteTenant(row.id).subscribe({
      next: () => {
        this.successMessage = `${row.name} deleted successfully.`;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete tenant.';
      },
      complete: () => {
        this.mutatingTenantId = null;
      },
    });
  }
}
