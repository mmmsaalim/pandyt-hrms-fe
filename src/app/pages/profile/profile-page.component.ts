import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, TenantFieldRuntimeConfig } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';
import { LeaveBalanceDisplayComponent } from '../leave/leave-balance-display.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, FormsModule, DatePipe, LeaveBalanceDisplayComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  profile: any = null;
  customFieldDefs: TenantFieldRuntimeConfig[] = [];
  editForm = {
    designation: '',
    customFields: {} as Record<string, unknown>,
  };

  constructor(
    readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  ngOnInit(): void {
    this.auth.refreshTenantConfig().subscribe({
      next: (config) => {
        this.auth.applyTenantConfig(config);
        this.customFieldDefs = config.fields?.['employees'] ?? [];
        this.loadProfile();
      },
      error: () => {
        this.customFieldDefs = this.auth.getModuleFields('employees');
        this.loadProfile();
      },
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';
    this.employeesService.getMe().subscribe({
      next: (profile: any) => {
        this.profile = profile;
        this.editForm = {
          designation: profile?.designation ?? '',
          customFields: { ...(profile?.customFields ?? {}) },
        };
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load your profile.';
        this.loading = false;
      },
    });
  }

  fieldOptions(field: TenantFieldRuntimeConfig): string[] {
    const options = field.options as { values?: string[] } | undefined;
    return options?.values ?? [];
  }

  saveProfile(): void {
    for (const field of this.customFieldDefs) {
      if (
        field.required &&
        (this.editForm.customFields[field.fieldKey] === undefined ||
          this.editForm.customFields[field.fieldKey] === '')
      ) {
        this.errorMessage = `${field.label} is required.`;
        return;
      }
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService
      .updateMe({
        designation: this.editForm.designation.trim() || undefined,
        customFields: this.editForm.customFields,
      })
      .subscribe({
        next: (profile: any) => {
          this.profile = profile;
          this.successMessage = 'Profile updated successfully.';
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update profile.';
          this.saving = false;
        },
        complete: () => {
          this.saving = false;
        },
      });
  }
}
