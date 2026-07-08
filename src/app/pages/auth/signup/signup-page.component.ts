import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { moduleIcon } from '../../../core/constants/module-icons';
import {
  MODULE_LABELS,
  SubscriptionPlanDefinition,
} from '../../../core/constants/subscription-plans';
import { TenantConfigurationService } from '../../../core/services/tenant-configuration.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.component.html',
  styleUrl: './signup-page.component.scss',
})
export class SignupPageComponent implements OnInit {
  loading = false;
  successMessage = '';
  errorMessage = '';
  showFormModal = false;
  subscriptionPlans: SubscriptionPlanDefinition[] = [];
  selectedPlanKey = '';
  readonly moduleLabels = MODULE_LABELS;

  readonly form = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    companyCode: [''],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPhone: ['', [Validators.required, Validators.minLength(7)]],
    employeeCount: [10, [Validators.required, Validators.min(1)]],
    address: [''],
    notes: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly tenantConfigurationService: TenantConfigurationService,
  ) {}

  ngOnInit(): void {
    this.tenantConfigurationService.loadPlatformPlans().subscribe({
      next: (plans) => {
        this.subscriptionPlans = plans.filter((plan) => plan.isActive !== false);
      },
      error: () => {
        this.subscriptionPlans = this.tenantConfigurationService.getPlatformPlans();
      },
    });
  }

  get selectedPlan(): SubscriptionPlanDefinition | undefined {
    return this.subscriptionPlans.find((plan) => plan.key === this.selectedPlanKey);
  }

  openPlanForm(planKey: string): void {
    this.selectedPlanKey = planKey;
    this.errorMessage = '';
    this.successMessage = '';
    const plan = this.subscriptionPlans.find((entry) => entry.key === planKey);
    if (plan?.seats && plan.seats > 0) {
      this.form.patchValue({ employeeCount: plan.seats });
    }
    this.showFormModal = true;
  }

  closePlanForm(): void {
    if (this.loading) return;
    this.showFormModal = false;
  }

  readonly moduleIcon = moduleIcon;

  moduleLabel(key: string): string {
    return this.moduleLabels[key] ?? key;
  }

  submit(): void {
    if (this.form.invalid || !this.selectedPlanKey) {
      return;
    }

    const { companyName, companyCode, adminName, adminEmail, adminPhone, employeeCount, address, notes } =
      this.form.getRawValue();
    if (!companyName || !adminName || !adminEmail || !adminPhone || !employeeCount) {
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
        adminPhone: adminPhone.trim(),
        employeeCount: Number(employeeCount),
        address: address?.trim() || undefined,
        source: 'Workspace access request',
        notes: notes?.trim() || undefined,
        requestedPlan: this.selectedPlanKey,
      })
      .subscribe({
        next: (res) => {
          this.successMessage =
            res.message ||
            `Access request submitted for ${this.selectedPlan?.label ?? 'Freemium'} plan. Super admin will review your lead and activate sign-in.`;
          this.form.reset({
            companyName: '',
            companyCode: '',
            adminName: '',
            adminEmail: '',
            adminPhone: '',
            employeeCount: this.selectedPlan?.seats && this.selectedPlan.seats > 0 ? this.selectedPlan.seats : 10,
            address: '',
            notes: '',
          });
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to submit access request.';
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
