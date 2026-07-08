import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.form.getRawValue();

    this.auth.login(email!, password!).subscribe({
      next: (res) => {
        this.auth.setSession(res.accessToken, res.user);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage =
          err.error?.message ||
          (err.status === 0
            ? 'Cannot connect to server. Please verify backend is running and CORS is enabled.'
            : 'Login failed. Please check your credentials.');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
