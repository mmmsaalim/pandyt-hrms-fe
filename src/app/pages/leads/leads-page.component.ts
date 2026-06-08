import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TenantsService } from '../../core/services/tenants.service';

type LeadStatus = 'PENDING' | 'CONVERTED' | 'DELETED';

type LeadRow = {
  id: number;
  name: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED';
  leadStatus: LeadStatus;
  seats: number;
  createdAt: string;
  pendingAdminInvitations?: number;
  latestAdminInvitation?: {
    id: number;
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
    invitedAt: string;
    acceptedAt: string | null;
    expiresAt: string;
  } | null;
};

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './leads-page.component.html',
  styleUrl: './leads-page.component.scss',
})
export class LeadsPageComponent implements OnInit {
  readonly rows = signal<LeadRow[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal('');

  constructor(private readonly tenantsService: TenantsService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.tenantsService.leads().subscribe({
      next: (res) => {
        this.rows.set(res as LeadRow[]);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Failed to load leads.');
        this.loading.set(false);
      },
    });
  }

  activeRows(): LeadRow[] {
    return this.rows().filter((row) => row.leadStatus === 'PENDING' || row.status === 'ACTIVE');
  }

  deletedRows(): LeadRow[] {
    return this.rows().filter((row) => row.leadStatus === 'DELETED' || (row.status === 'SUSPENDED' && row.leadStatus !== 'PENDING'));
  }

  private friendlyStatus(value: string): string {
    switch (value) {
      case 'ACTIVE':
        return 'Active';
      case 'PENDING':
        return 'Pending';
      case 'CONVERTED':
        return 'Approved';
      case 'DELETED':
        return 'Deleted';
      case 'SUSPENDED':
        return 'Suspended';
      case 'ACCEPTED':
        return 'Accepted';
      case 'EXPIRED':
        return 'Expired';
      case 'REVOKED':
        return 'Revoked';
      default:
        return value;
    }
  }

  leadStatusLabel(status: LeadStatus): string {
    return this.friendlyStatus(status);
  }

  invitationStatusLabel(status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'): string {
    return this.friendlyStatus(status);
  }

  tenantStatusLabel(row: Pick<LeadRow, 'status' | 'leadStatus'>): string {
    if (row.leadStatus === 'PENDING') {
      return 'Pending Approval';
    }

    if (row.status === 'SUSPENDED' && row.leadStatus === 'CONVERTED') {
      return 'Suspended - Payment Due';
    }

    return this.friendlyStatus(row.status);
  }

  tenantStatusToken(row: Pick<LeadRow, 'status' | 'leadStatus'>): string {
    if (row.leadStatus === 'PENDING') {
      return 'PENDING';
    }

    if (row.status === 'SUSPENDED' && row.leadStatus === 'CONVERTED') {
      return 'SUSPENDED_PAYMENT';
    }

    return row.status;
  }

  badgeClass(value: string): string {
    switch (value) {
      case 'CONVERTED':
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'badge success';
      case 'PENDING':
      case 'Pending Approval':
        return 'badge pending';
      case 'DELETED':
      case 'REVOKED':
      case 'SUSPENDED':
      case 'Suspended - Payment Due':
      case 'SUSPENDED_PAYMENT':
        return 'badge danger';
      default:
        return 'badge neutral';
    }
  }
}
