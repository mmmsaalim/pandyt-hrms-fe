import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InvitationsService } from '../../core/services/invitations.service';

interface InvitationRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  company: { id: string; name: string } | null;
  invitedBy: string | null;
}

@Component({
  selector: 'app-invitations-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './invitations-page.component.html',
  styleUrl: './invitations-page.component.scss',
})
export class InvitationsPageComponent implements OnInit {
  invitations = signal<InvitationRow[]>([]);
  loading = signal(true);
  errorMsg = signal('');
  resendingEmail = signal<string | null>(null);
  resendSuccess = signal<string | null>(null);

  constructor(private readonly invitationsService: InvitationsService) {}

  ngOnInit() {
    this.loadInvitations();
  }

  loadInvitations() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.invitationsService.list().subscribe({
      next: (rows) => {
        this.invitations.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Failed to load invitations.');
        this.loading.set(false);
      },
    });
  }

  resend(row: InvitationRow) {
    this.resendingEmail.set(row.email);
    this.resendSuccess.set(null);
    this.invitationsService.resend(row.email).subscribe({
      next: () => {
        this.resendingEmail.set(null);
        this.resendSuccess.set(`Invitation resent to ${row.email}.`);
        this.loadInvitations();
      },
      error: (err) => {
        this.resendingEmail.set(null);
        this.errorMsg.set(err?.error?.message ?? 'Failed to resend invitation.');
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACCEPTED': return 'badge accepted';
      case 'EXPIRED': return 'badge expired';
      case 'REVOKED': return 'badge revoked';
      default: return 'badge pending';
    }
  }
}
