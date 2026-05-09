import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { TenantsService } from '../../core/services/tenants.service';

interface PaymentRow {
  tenantId: string;
  companyName: string;
  plan: string;
  status: string;
  billingStatus: 'CURRENT' | 'ACTION_REQUIRED' | 'OVERDUE';
  includedSeats: number;
  activeEmployees: number;
  overageSeats: number;
  seatPrice: number;
  currency: string;
  subtotal: number;
  tax: number;
  totalDue: number;
  renewalDate: string;
  createdAt: string;
}

@Component({
  selector: 'app-company-payments-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './company-payments-page.component.html',
  styleUrl: './company-payments-page.component.scss',
})
export class CompanyPaymentsPageComponent implements OnInit {
  rows = signal<PaymentRow[]>([]);
  loading = signal(true);
  errorMessage = signal('');

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

  totalRevenueDue(): number {
    return this.rows().reduce((acc, row) => acc + Number(row.totalDue || 0), 0);
  }
}
