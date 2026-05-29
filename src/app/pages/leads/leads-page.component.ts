import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './leads-page.component.html',
  styleUrl: './leads-page.component.scss',
})
export class LeadsPageComponent implements OnInit {
  readonly rows = signal<LeadRow[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal('');
  statusFilter: 'ALL' | LeadStatus = 'ALL';

  constructor(private readonly tenantsService: TenantsService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.tenantsService.leads(status).subscribe({
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

  badgeClass(value: string): string {
    switch (value) {
      case 'CONVERTED':
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'badge success';
      case 'PENDING':
        return 'badge pending';
      case 'DELETED':
      case 'REVOKED':
      case 'SUSPENDED':
        return 'badge danger';
      default:
        return 'badge neutral';
    }
  }
}
