import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../core/services/tenants.service';
import {
  TenantConfigurationModule,
  TenantConfigurationResponse,
  TenantConfigurationService,
} from '../../core/services/tenant-configuration.service';
import {
  DEFAULT_EMPLOYEE_PROFILE_FIELDS,
  seatsForPlan,
} from '../../core/constants/subscription-plans';
import {
  LeavePolicyPreset,
  cloneLeavePresets,
} from '../../core/constants/leave-presets';
import {
  DEFAULT_PAYSLIP_TEMPLATE_KEY,
  PAYSLIP_TEMPLATE_OPTIONS,
} from '../../core/constants/payslip-templates';
import { ActivatedRoute } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';
import { CommonModule } from '@angular/common';
import { DEFAULT_PAGINATION, PaginationMeta } from '../../core/models/pagination.model';
import { ListPaginationComponent } from '../../shared/list-pagination/list-pagination.component';

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ConfirmDialogComponent, EditDialogShellComponent, CommonModule, ListPaginationComponent],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
})
export class TenantsPageComponent implements OnInit {
  rows: any[] = [];
  activeRows: any[] = [];
  archivedRows: any[] = [];
  activePagination: PaginationMeta = { ...DEFAULT_PAGINATION };
  archivedPagination: PaginationMeta = { ...DEFAULT_PAGINATION };
  activeLoading = false;
  archivedLoading = false;
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
    mode: 'approve' | 'archive' | 'deactivate' | 'reactivate';
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
    subscriptionPlan: 'STARTER',
    seats: seatsForPlan('STARTER'),
  };

  planOptions: Array<{ key: string; label: string; seats: number | null; description: string }> = [];

  configuringTenantId: number | null = null;
  configBusy = false;
  configSeats = 0;
  configModules: TenantConfigurationModule[] = [];
  configPlan = 'STARTER';
  configLocale = {
    locale: 'en-LK',
    currency: 'LKR',
    fiscalYearStartMonth: 4,
    payslipTemplateKey: DEFAULT_PAYSLIP_TEMPLATE_KEY,
  };
  leavePolicies: LeavePolicyPreset[] = cloneLeavePresets();
  readonly payslipTemplateOptions = PAYSLIP_TEMPLATE_OPTIONS;

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantConfigurationService: TenantConfigurationService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.tenantConfigurationService.loadPlatformPlans().subscribe({
      next: (plans) => {
        this.planOptions = plans.map((plan) => ({
          key: plan.key,
          label: plan.label,
          seats: plan.seats,
          description: plan.description,
        }));
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      this.showCreateForm = params.get('new') === '1';
      if (this.showCreateForm) {
        this.loadCreateDefaults(this.form.subscriptionPlan);
      }
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
    let completed = 0;
    const done = () => {
      completed += 1;
      this.rows = [...this.activeRows, ...this.archivedRows];
      if (completed === 2 && callback) {
        callback();
      }
    };

    this.activeLoading = true;
    this.tenantsService.list({ group: 'active', page: this.activePagination.page, limit: this.activePagination.limit }).subscribe({
      next: (res) => {
        this.activeRows = res.items;
        this.activePagination = {
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
        };
        done();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load active tenants.';
        done();
      },
      complete: () => {
        this.activeLoading = false;
      },
    });

    this.archivedLoading = true;
    this.tenantsService.list({ group: 'archived', page: this.archivedPagination.page, limit: this.archivedPagination.limit }).subscribe({
      next: (res) => {
        this.archivedRows = res.items;
        this.archivedPagination = {
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
        };
        done();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load archived tenants.';
        done();
      },
      complete: () => {
        this.archivedLoading = false;
      },
    });
  }

  onActivePageChange(page: number): void {
    this.activePagination = { ...this.activePagination, page };
    this.loadRows();
  }

  onActiveLimitChange(limit: number): void {
    this.activePagination = { ...this.activePagination, page: 1, limit };
    this.loadRows();
  }

  onArchivedPageChange(page: number): void {
    this.archivedPagination = { ...this.archivedPagination, page };
    this.loadRows();
  }

  onArchivedLimitChange(limit: number): void {
    this.archivedPagination = { ...this.archivedPagination, page: 1, limit };
    this.loadRows();
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
        return 'Archived';
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

    if (row.status === 'SUSPENDED' && row.leadStatus === 'DELETED') {
      return 'Archived';
    }

    return this.friendlyStatus(row.status);
  }

  canDeactivateForPayment(row: { status: string; leadStatus: string }): boolean {
    return row.status === 'ACTIVE' && row.leadStatus === 'CONVERTED';
  }

  canArchiveTenant(row: { status: string; leadStatus: string }): boolean {
    return row.status === 'ACTIVE' || row.leadStatus === 'PENDING';
  }

  canReactivateTenant(row: { status: string }): boolean {
    return row.status === 'SUSPENDED';
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
    this.leavePolicies = cloneLeavePresets();
    this.configLocale.payslipTemplateKey = DEFAULT_PAYSLIP_TEMPLATE_KEY;
    this.loadCreateDefaults(this.form.subscriptionPlan);
  }

  onCreatePlanChange(): void {
    this.configPlan = this.form.subscriptionPlan;
    this.form.seats = seatsForPlan(this.form.subscriptionPlan);
    this.loadCreateDefaults(this.form.subscriptionPlan);
  }

  onEditPlanChange(): void {
    this.editTenantForm.seats = seatsForPlan(this.editTenantForm.plan);
  }

  planDescription(plan: string): string {
    return this.planOptions.find((entry) => entry.key === plan.trim().toUpperCase())?.description ?? '';
  }

  formatSeats(plan: string, seats?: number): string {
    return this.tenantConfigurationService.seatsDisplay(plan, seats);
  }

  formatPlanLabel(plan: string): string {
    return this.tenantConfigurationService.planLabel(plan);
  }

  private loadCreateDefaults(plan: string): void {
    this.configPlan = plan;
    this.tenantConfigurationService.listPlatformModules().subscribe({
      next: (modules) => {
        const preset = this.tenantConfigurationService.modulesForPlan(plan);
        this.configModules = modules.map((module) => ({
          key: module.key,
          label: module.label,
          description: module.description,
          enabled: preset.includes(module.key),
          fields: (module.fields ?? []).map((field) => ({
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            options: field.options,
            isSystem: field.isSystem,
            enabled:
              field.isSystem ||
              (module.key === 'employees' && DEFAULT_EMPLOYEE_PROFILE_FIELDS.includes(field.fieldKey)),
            required:
              module.key === 'employees' && (field.fieldKey === 'nic' || field.fieldKey === 'epfNo'),
            sortOrder: 0,
          })),
        }));
      },
    });
  }

  private planDefaultModules(plan: string): string[] {
    return this.tenantConfigurationService.modulesForPlan(plan);
  }

  private buildConfigurationPayload() {
    const enabledModules = this.configModules.filter((module) => module.enabled).map((module) => module.key);
    const moduleFeatures: Record<string, Record<string, { enabled?: boolean; required?: boolean }>> = {};

    for (const module of this.configModules) {
      if (!module.enabled) {
        continue;
      }

      moduleFeatures[module.key] = {};
      for (const field of module.fields) {
        moduleFeatures[module.key][field.fieldKey] = {
          enabled: field.enabled,
          required: field.required,
        };
      }
    }

    const config: Record<string, unknown> = { ...this.configLocale };
    if (enabledModules.includes('leave')) {
      config['leaveSetup'] = {
        preset: 'SRI_LANKA',
        policies: this.leavePolicies.map((policy) => ({ ...policy })),
      };
    }

    return {
      plan: this.configuringTenantId ? this.configPlan : this.form.subscriptionPlan,
      enabledModules,
      moduleFeatures,
      config,
    };
  }

  isLeaveModuleEnabled(): boolean {
    return this.configModules.some((module) => module.key === 'leave' && module.enabled);
  }

  resetLeavePoliciesToSriLanka(): void {
    this.leavePolicies = cloneLeavePresets();
  }

  addLeavePolicyRow(): void {
    this.leavePolicies = [
      ...this.leavePolicies,
      {
        code: `custom-${this.leavePolicies.length + 1}`,
        name: 'Custom Leave',
        days: 0,
        carryForwardLimit: 0,
        accrualRate: 0,
        sortOrder: this.leavePolicies.length + 1,
        genderScope: 'ALL',
      },
    ];
  }

  removeLeavePolicyRow(index: number): void {
    this.leavePolicies = this.leavePolicies.filter((_, rowIndex) => rowIndex !== index);
  }

  private applyLeaveSetupFromConfig(config: Record<string, unknown> | undefined): void {
    const leaveSetup = config?.['leaveSetup'] as { policies?: LeavePolicyPreset[] } | undefined;
    if (leaveSetup?.policies?.length) {
      this.leavePolicies = leaveSetup.policies.map((row, index) => ({
        code: row.code ?? `policy-${index + 1}`,
        name: row.name,
        days: Number(row.days ?? 0),
        carryForwardLimit: Number(row.carryForwardLimit ?? 0),
        accrualRate: Number(row.accrualRate ?? 0),
        sortOrder: Number(row.sortOrder ?? index + 1),
        description: row.description,
        genderScope: row.genderScope ?? 'ALL',
      }));
      return;
    }

    this.leavePolicies = cloneLeavePresets();
  }

  configureTenant(row: any): void {
    this.configuringTenantId = row.id;
    this.configBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantConfigurationService.getTenantConfiguration(row.id).subscribe({
      next: (config: TenantConfigurationResponse) => {
        this.configPlan = config.plan;
        this.configSeats = config.seats ?? seatsForPlan(config.plan);
        this.configModules = config.modules;
        this.configLocale = {
          locale: String(config.config?.['locale'] ?? 'en-LK'),
          currency: String(config.config?.['currency'] ?? 'LKR'),
          fiscalYearStartMonth: Number(config.config?.['fiscalYearStartMonth'] ?? 4),
          payslipTemplateKey: String(
            config.config?.['payslipTemplateKey'] ?? DEFAULT_PAYSLIP_TEMPLATE_KEY,
          ),
        };
        this.applyLeaveSetupFromConfig(config.config as Record<string, unknown> | undefined);
        this.configBusy = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load tenant configuration.';
        this.configBusy = false;
      },
    });
  }

  closeConfigureDialog(): void {
    if (this.configBusy) {
      return;
    }

    this.configuringTenantId = null;
  }

  saveTenantConfiguration(): void {
    if (this.configuringTenantId === null) {
      return;
    }

    this.configBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.saveTenantConfiguration(this.configuringTenantId, this.buildConfigurationPayload()).subscribe({
      next: () => {
        this.successMessage = 'Tenant configuration saved successfully.';
        this.configuringTenantId = null;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save tenant configuration.';
        this.configBusy = false;
      },
      complete: () => {
        this.configBusy = false;
      },
    });
  }

  applyPlanPresetToConfig(): void {
    const preset = new Set(this.planDefaultModules(this.configPlan));
    this.configSeats = seatsForPlan(this.configPlan);
    this.configModules = this.configModules.map((module) => ({
      ...module,
      enabled: preset.has(module.key),
    }));
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
        subscriptionPlan: this.form.subscriptionPlan.trim() || 'STARTER',
        seats: Number(this.form.seats) || 1,
        ...this.buildConfigurationPayload(),
      })
      .subscribe({
        next: (res: any) => {
          const createdCode = res?.tenant?.companyCode || '';
          this.form = {
            companyName: '',
            companyCode: '',
            adminName: '',
            adminEmail: '',
            subscriptionPlan: 'STARTER',
            seats: seatsForPlan('STARTER'),
          };
          this.configModules = [];
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

  deactivateTenant(row: any): void {
    this.confirmDialog = {
      mode: 'deactivate',
      tenant: row,
      title: 'Deactivate for overdue payment?',
      message: `Suspend ${row?.name} because payment is overdue?`,
      detail: 'Tenant users will see a payment suspension message when they try to sign in. You can reactivate later.',
      confirmText: 'Deactivate',
      tone: 'danger',
    };
  }

  archiveTenant(row: any): void {
    this.confirmDialog = {
      mode: 'archive',
      tenant: row,
      title: 'Archive tenant?',
      message: `Archive ${row?.name}? This deactivates the workspace but keeps data for reactivation.`,
      detail: 'Archived tenant users will see a deactivation message on login. Use Reactivate to restore access.',
      confirmText: 'Archive tenant',
      tone: 'danger',
    };
  }

  reactivateTenant(row: any): void {
    this.confirmDialog = {
      mode: 'reactivate',
      tenant: row,
      title: 'Reactivate tenant?',
      message: `Restore access for ${row?.name}?`,
      detail: 'Tenant status will return to Active and users can sign in again.',
      confirmText: 'Reactivate',
      tone: 'primary',
    };
  }

  deleteTenant(row: any): void {
    this.archiveTenant(row);
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

    const request$ =
      this.confirmDialog.mode === 'deactivate'
        ? this.tenantsService.deactivateTenantForPayment(row.id)
        : this.confirmDialog.mode === 'reactivate'
          ? this.tenantsService.reactivateTenant(row.id)
          : this.tenantsService.deleteTenant(row.id);

    const successCopy =
      this.confirmDialog.mode === 'deactivate'
        ? `${row.name} deactivated for overdue payment. Users will see a payment suspension message on login.`
        : this.confirmDialog.mode === 'reactivate'
          ? `${row.name} reactivated successfully. Users can sign in again.`
          : `${row.name} archived successfully. Use Reactivate to restore access.`;

    request$.subscribe({
      next: () => {
        this.successMessage = successCopy;
        this.confirmDialog = null;
        this.loadRows();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update tenant status.';
      },
      complete: () => {
        this.mutatingTenantId = null;
        this.confirmBusy = false;
      },
    });
  }
}
