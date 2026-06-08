import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.component.html',
  styleUrl: './signup-page.component.scss',
})
export class SignupPageComponent {
  loading = false;
  successMessage = '';
  errorMessage = '';

  readonly form = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    companyCode: [''],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { companyName, companyCode, adminName, adminEmail } = this.form.getRawValue();
    if (!companyName || !adminName || !adminEmail) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth
      .signup({
        companyName: companyName.trim(),
        companyCode: companyCode?.trim() || undefined,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      })
      .subscribe({
        next: (res) => {
          this.successMessage =
            res.message ||
            'Signup submitted. Your request is now pending lead and super admin approval.';
          this.form.reset({
            companyName: '',
            companyCode: '',
            adminName: '',
            adminEmail: '',
          });
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to submit signup request.';
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
