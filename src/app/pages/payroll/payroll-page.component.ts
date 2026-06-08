import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../core/services/payroll.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';

@Component({
  selector: 'app-payroll-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, CurrencyPipe, DatePipe, FormsModule, ConfirmDialogComponent],
  templateUrl: './payroll-page.component.html',
  styleUrl: './payroll-page.component.scss',
})
export class PayrollPageComponent implements OnInit {
  rows: any[] = [];
  isCompanyAdmin = false;
  showCreateForm = false;
  busy = false;
  busyRunId: number | null = null;
  newPeriod = '';
  message = '';
  messageType: 'success' | 'error' = 'success';
  pendingAction: { type: 'process' | 'delete'; run: any } | null = null;
  confirmBusy = false;

  get confirmDialogTitle(): string {
    if (!this.pendingAction) {
      return 'Confirm action';
    }

    return this.pendingAction.type === 'process' ? 'Process payroll run?' : 'Delete payroll run?';
  }

  get confirmDialogMessage(): string {
    if (!this.pendingAction) {
      return '';
    }

    if (this.pendingAction.type === 'process') {
      return `Process payroll for period "${this.pendingAction.run.period}"? This calculates EPF/ETF/PAYE for active employees.`;
    }

    return `Delete payroll run for "${this.pendingAction.run.period}"?`;
  }

  get confirmDialogText(): string {
    return this.pendingAction?.type === 'process' ? 'Process run' : 'Delete run';
  }

  get confirmDialogTone(): 'primary' | 'danger' {
    return this.pendingAction?.type === 'process' ? 'primary' : 'danger';
  }

  constructor(
    private readonly payrollService: PayrollService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isCompanyAdmin = this.auth.user()?.roles.includes('COMPANY_ADMIN') ?? false;
    this.load();
  }

  load(): void {
    this.payrollService.list().subscribe((res: any) => (this.rows = res));
  }

  createRun(): void {
    if (!this.newPeriod.trim()) {
      this.showMsg('Period is required (e.g. 2026-05).', 'error');
      return;
    }
    this.busy = true;
    this.payrollService.create(this.newPeriod.trim()).subscribe({
      next: () => { this.newPeriod = ''; this.showCreateForm = false; this.load(); this.showMsg('Payroll run created.', 'success'); },
      error: (err) => this.showMsg(err?.error?.message || 'Failed to create run.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  processRun(run: any): void {
    if (run.status === 'COMPLETED') {
      return;
    }

    this.pendingAction = { type: 'process', run };
  }

  private runProcess(run: any): void {
    this.busyRunId = run.id;
    this.payrollService.process(run.id).subscribe({
      next: () => { this.showMsg('Payroll processed successfully.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Processing failed.', 'error'),
      complete: () => {
        this.busyRunId = null;
        this.confirmBusy = false;
      },
    });
  }

  deleteRun(run: any): void {
    this.pendingAction = { type: 'delete', run };
  }

  private runDelete(run: any): void {
    this.busyRunId = run.id;
    this.payrollService.remove(run.id).subscribe({
      next: () => { this.showMsg('Run deleted.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Delete failed.', 'error'),
      complete: () => {
        this.busyRunId = null;
        this.confirmBusy = false;
      },
    });
  }

  closeConfirmDialog(): void {
    if (this.confirmBusy) {
      return;
    }

    this.pendingAction = null;
  }

  confirmAction(): void {
    if (!this.pendingAction) {
      return;
    }

    this.confirmBusy = true;
    const action = this.pendingAction;
    this.pendingAction = null;

    if (action.type === 'process') {
      this.runProcess(action.run);
      return;
    }

    this.runDelete(action.run);
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
