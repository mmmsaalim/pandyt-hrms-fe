import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TenantsService } from '../../core/services/tenants.service';
import { DEFAULT_PAGINATION, PaginationMeta } from '../../core/models/pagination.model';
import { ListPaginationComponent } from '../../shared/list-pagination/list-pagination.component';

type LeadStatus = 'PENDING' | 'CONVERTED' | 'DELETED';

type LeadRow = {
  id: number;
  name: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED';
  leadStatus: LeadStatus;
  seats: number;
  createdAt: string;
  leadDetails?: {
    adminPhone?: string | null;
    employeeCount?: number | null;
    address?: string | null;
    source?: string | null;
    notes?: string | null;
  } | null;
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
  imports: [CommonModule, DatePipe, ListPaginationComponent],
  templateUrl: './leads-page.component.html',
  styleUrl: './leads-page.component.scss',
})
export class LeadsPageComponent implements OnInit {
  readonly activeRows = signal<LeadRow[]>([]);
  readonly deletedRows = signal<LeadRow[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal('');
  readonly activePagination = signal<PaginationMeta>({ ...DEFAULT_PAGINATION });
  readonly deletedPagination = signal<PaginationMeta>({ ...DEFAULT_PAGINATION });

  constructor(private readonly tenantsService: TenantsService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    let completed = 0;
    const done = () => {
      completed += 1;
      if (completed === 2) {
        this.loading.set(false);
      }
    };

    this.tenantsService.leads({ group: 'active', page: this.activePagination().page, limit: this.activePagination().limit }).subscribe({
      next: (res) => {
        this.activeRows.set(res.items as LeadRow[]);
        this.activePagination.set({
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
        });
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Failed to load active leads.');
      },
      complete: done,
    });

    this.tenantsService.leads({ group: 'archived', page: this.deletedPagination().page, limit: this.deletedPagination().limit }).subscribe({
      next: (res) => {
        this.deletedRows.set(res.items as LeadRow[]);
        this.deletedPagination.set({
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
        });
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Failed to load deleted/suspended leads.');
      },
      complete: done,
    });
  }

  onActivePageChange(page: number): void {
    this.activePagination.set({ ...this.activePagination(), page });
    this.loadRows();
  }

  onActiveLimitChange(limit: number): void {
    this.activePagination.set({ ...this.activePagination(), page: 1, limit });
    this.loadRows();
  }

  onDeletedPageChange(page: number): void {
    this.deletedPagination.set({ ...this.deletedPagination(), page });
    this.loadRows();
  }

  onDeletedLimitChange(limit: number): void {
    this.deletedPagination.set({ ...this.deletedPagination(), page: 1, limit });
    this.loadRows();
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
