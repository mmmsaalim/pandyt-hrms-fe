import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../core/services/tenants.service';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';

interface PaymentRow {
  tenantId: number;
  companyName: string;
  plan: string;
  planKey?: string;
  status: string;
  billingStatus: 'CURRENT' | 'ACTION_REQUIRED' | 'OVERDUE';
  includedSeats: number;
  activeEmployees: number;
  overageSeats: number;
  monthlyPlanPrice: number | null;
  overageSeatPrice: number;
  isCustomPricing?: boolean;
  seatPrice: number;
  currency: string;
  subtotal: number;
  tax: number;
  totalDue: number | null;
  renewalDate: string;
  createdAt: string;
}

@Component({
  selector: 'app-company-payments-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, ConfirmDialogComponent, EditDialogShellComponent],
  templateUrl: './company-payments-page.component.html',
  styleUrl: './company-payments-page.component.scss',
})
export class CompanyPaymentsPageComponent implements OnInit {
  rows = signal<PaymentRow[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  actionMessage = signal('');
  actionType = signal<'success' | 'error'>('success');
  remindingTenantId = signal<number | null>(null);
  sendingAll = signal(false);
  runningDailySchedule = signal(false);
  confirmDialog = signal<{ mode: 'single' | 'all'; row?: PaymentRow } | null>(null);
  settingsTenant = signal<PaymentRow | null>(null);
  settingsLoading = signal(false);
  settingsSaving = signal(false);
  settingsForm = {
    enabled: true,
    reminderDaysCsv: '7,3,1,0',
    recipientEmailsCsv: '',
    subjectTemplate: '',
    bodyTemplate: '',
  };

  constructor(private readonly tenantsService: TenantsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.tenantsService.billingOverview().subscribe({
      next: (res: any) => {
        this.rows.set((res ?? []) as PaymentRow[]);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Failed to load company payment details.');
        this.loading.set(false);
      },
    });
  }

  statusClass(status: PaymentRow['billingStatus']): string {
    switch (status) {
      case 'CURRENT':
        return 'status current';
      case 'ACTION_REQUIRED':
        return 'status warn';
      case 'OVERDUE':
        return 'status overdue';
      default:
        return 'status';
    }
  }

  tenantStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'SUSPENDED':
        return 'Suspended';
      default:
        return status;
    }
  }

  billingStatusLabel(status: PaymentRow['billingStatus']): string {
    switch (status) {
      case 'CURRENT':
        return 'Current';
      case 'ACTION_REQUIRED':
        return 'Action Required';
      case 'OVERDUE':
        return 'Overdue';
      default:
        return status;
    }
  }

  totalRevenueDue(): number {
    return this.rows().reduce((acc, row) => acc + Number(row.totalDue ?? 0), 0);
  }

  formatTotalDue(row: PaymentRow): string {
    if (row.isCustomPricing && row.totalDue === null) {
      return 'Custom';
    }
    return `LKR ${Number(row.totalDue ?? 0).toLocaleString()}`;
  }

  overdueRows(): PaymentRow[] {
    return this.rows().filter((row) => row.billingStatus === 'OVERDUE');
  }

  openSingleReminderDialog(row: PaymentRow): void {
    this.confirmDialog.set({ mode: 'single', row });
  }

  openAllReminderDialog(): void {
    this.confirmDialog.set({ mode: 'all' });
  }

  closeConfirmDialog(): void {
    if (this.remindingTenantId() !== null || this.sendingAll()) {
      return;
    }

    this.confirmDialog.set(null);
  }

  confirmReminderAction(): void {
    const dialog = this.confirmDialog();
    if (!dialog) {
      return;
    }

    this.actionMessage.set('');

    if (dialog.mode === 'single' && dialog.row) {
      this.remindingTenantId.set(Number(dialog.row.tenantId));
      this.tenantsService.sendOverdueReminder(Number(dialog.row.tenantId)).subscribe({
        next: () => {
          this.actionType.set('success');
          this.actionMessage.set(`Reminder sent to ${dialog.row?.companyName}.`);
          this.confirmDialog.set(null);
        },
        error: (err) => {
          this.actionType.set('error');
          this.actionMessage.set(err?.error?.message ?? 'Failed to send reminder.');
        },
        complete: () => {
          this.remindingTenantId.set(null);
        },
      });
      return;
    }

    this.sendingAll.set(true);
    this.tenantsService.sendAllOverdueReminders().subscribe({
      next: (res: any) => {
        this.actionType.set('success');
        this.actionMessage.set(`Sent reminders for ${res?.tenantsReminded ?? 0} tenant(s).`);
        this.confirmDialog.set(null);
      },
      error: (err) => {
        this.actionType.set('error');
        this.actionMessage.set(err?.error?.message ?? 'Failed to send overdue reminders.');
      },
      complete: () => {
        this.sendingAll.set(false);
      },
    });
  }

  runDailySchedule(): void {
    this.runningDailySchedule.set(true);
    this.tenantsService.runDailyBillingReminderSchedule().subscribe({
      next: (res: any) => {
        this.actionType.set('success');
        this.actionMessage.set(
          `Daily reminder run complete. Tenants reminded: ${res?.tenantsReminded ?? 0}, emails sent: ${res?.emailsSent ?? 0}.`,
        );
      },
      error: (err) => {
        this.actionType.set('error');
        this.actionMessage.set(err?.error?.message ?? 'Failed to run daily reminder schedule.');
      },
      complete: () => {
        this.runningDailySchedule.set(false);
      },
    });
  }

  openSettingsDialog(row: PaymentRow): void {
    this.settingsTenant.set(row);
    this.settingsLoading.set(true);
    this.actionMessage.set('');

    this.tenantsService.getBillingSettings(row.tenantId).subscribe({
      next: (res: any) => {
        this.settingsForm = {
          enabled: res?.enabled ?? true,
          reminderDaysCsv: Array.isArray(res?.reminderDays) ? res.reminderDays.join(',') : '7,3,1,0',
          recipientEmailsCsv: Array.isArray(res?.recipientEmails) ? res.recipientEmails.join(', ') : '',
          subjectTemplate: res?.subjectTemplate ?? '',
          bodyTemplate: res?.bodyTemplate ?? '',
        };
      },
      error: (err) => {
        this.actionType.set('error');
        this.actionMessage.set(err?.error?.message ?? 'Failed to load billing settings.');
        this.settingsTenant.set(null);
      },
      complete: () => {
        this.settingsLoading.set(false);
      },
    });
  }

  closeSettingsDialog(): void {
    if (this.settingsSaving()) {
      return;
    }

    this.settingsTenant.set(null);
  }

  saveSettings(): void {
    const tenant = this.settingsTenant();
    if (!tenant) {
      return;
    }

    const reminderDays = this.settingsForm.reminderDaysCsv
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= -30 && value <= 30);

    if (reminderDays.length === 0) {
      this.actionType.set('error');
      this.actionMessage.set('Reminder days must include at least one integer between -30 and 30.');
      return;
    }

    const recipientEmails = this.settingsForm.recipientEmailsCsv
      .split(',')
      .map((value) => value.trim())
      .filter((value) => !!value);

    this.settingsSaving.set(true);
    this.tenantsService
      .updateBillingSettings(tenant.tenantId, {
        enabled: this.settingsForm.enabled,
        reminderDays,
        recipientEmails,
        subjectTemplate: this.settingsForm.subjectTemplate.trim() || undefined,
        bodyTemplate: this.settingsForm.bodyTemplate.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.actionType.set('success');
          this.actionMessage.set(`Billing settings updated for ${tenant.companyName}.`);
          this.settingsTenant.set(null);
        },
        error: (err) => {
          this.actionType.set('error');
          this.actionMessage.set(err?.error?.message ?? 'Failed to update billing settings.');
        },
        complete: () => {
          this.settingsSaving.set(false);
        },
      });
  }
}
