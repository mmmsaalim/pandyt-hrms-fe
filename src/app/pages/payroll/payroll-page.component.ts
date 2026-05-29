import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../core/services/payroll.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-payroll-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, CurrencyPipe, DatePipe, FormsModule],
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
    if (run.status === 'COMPLETED') { return; }
    if (!confirm(`Process payroll for period "${run.period}"? This will calculate EPF/ETF/PAYE for all active employees.`)) { return; }
    this.busyRunId = run.id;
    this.payrollService.process(run.id).subscribe({
      next: () => { this.showMsg('Payroll processed successfully.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Processing failed.', 'error'),
      complete: () => (this.busyRunId = null),
    });
  }

  deleteRun(run: any): void {
    if (!confirm(`Delete payroll run for "${run.period}"?`)) { return; }
    this.busyRunId = run.id;
    this.payrollService.remove(run.id).subscribe({
      next: () => { this.showMsg('Run deleted.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Delete failed.', 'error'),
      complete: () => (this.busyRunId = null),
    });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
