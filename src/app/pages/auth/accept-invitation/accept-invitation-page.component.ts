import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationsService } from '../../../core/services/invitations.service';

@Component({
  selector: 'app-accept-invitation-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accept-invitation-page.component.html',
  styleUrl: './accept-invitation-page.component.scss',
})
export class AcceptInvitationPageComponent implements OnInit {
  token = '';
  loading = true;
  errorMessage = '';
  invitation: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invitationsService: InvitationsService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.loading = false;
      this.errorMessage = 'Invitation token is missing.';
      return;
    }

    this.invitationsService.resolve(this.token).subscribe({
      next: (res) => {
        this.invitation = res;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Invitation is invalid or expired.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  continueToSetPassword(): void {
    this.router.navigate(['/set-password'], { queryParams: { token: this.token } });
  }
}
