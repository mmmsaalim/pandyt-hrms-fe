import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationsService } from '../../../core/services/invitations.service';

@Component({
  selector: 'app-set-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './set-password-page.component.html',
  styleUrl: './set-password-page.component.scss',
})
export class SetPasswordPageComponent implements OnInit {
  token = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invitationsService: InvitationsService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage = 'Invitation token is missing.';
    }
  }

  submit(): void {
    if (this.form.invalid || !this.token) {
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.invitationsService.accept(this.token, password!).subscribe({
      next: () => {
        this.successMessage = 'Password set successfully. You can now log in.';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to accept invitation.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
