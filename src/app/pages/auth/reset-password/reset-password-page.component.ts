import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent implements OnInit {
  token = '';
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;
  showConfirm = false;

  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage = 'Reset token is missing.';
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

    this.auth.resetPassword(this.token, password!).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Password updated successfully.';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to reset password.';
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
