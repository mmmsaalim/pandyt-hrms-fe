import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlatformBillingConfig,
  PlatformModuleDefinition,
  PlatformPlanDefinition,
  TenantConfigurationService,
} from '../../core/services/tenant-configuration.service';
import { SUBSCRIPTION_PLANS } from '../../core/constants/subscription-plans';

@Component({
  selector: 'app-platform-catalog-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './platform-catalog-page.component.html',
  styleUrl: './platform-catalog-page.component.scss',
})
export class PlatformCatalogPageComponent implements OnInit {
  activeTab: 'modules' | 'billing' = 'modules';
  modules: PlatformModuleDefinition[] = [];
  plans: PlatformPlanDefinition[] = SUBSCRIPTION_PLANS.map((plan) => ({
    ...plan,
    priceLkr: plan.key === 'FREEMIUM' ? 0 : plan.key === 'STARTER' ? 4000 : plan.key === 'GROWTH' ? 12000 : null,
    defaultModules: [],
  }));
  billingForm: PlatformBillingConfig = {
    taxRate: 0.18,
    overageSeatPriceLkr: 500,
    plans: {},
  };

  loading = false;
  savingModule = false;
  savingField = false;
  savingBilling = false;
  errorMessage = '';
  successMessage = '';
  selectedModuleKey = '';

  moduleForm = { key: '', label: '', description: '' };
  fieldForm = { fieldKey: '', label: '', fieldType: 'text' };

  readonly planLabels = SUBSCRIPTION_PLANS;

  constructor(private readonly tenantConfigurationService: TenantConfigurationService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  setTab(tab: 'modules' | 'billing'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  loadAll(): void {
    this.loading = true;
    this.tenantConfigurationService.listPlatformModules().subscribe({
      next: (rows) => {
        this.modules = rows;
        if (!this.selectedModuleKey && rows.length > 0) {
          this.selectedModuleKey = rows[0].key;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load platform catalog.';
        this.loading = false;
      },
    });

    this.tenantConfigurationService.getPlatformBilling().subscribe({
      next: (billing) => {
        this.billingForm = billing as PlatformBillingConfig;
        for (const plan of this.planLabels) {
          if (!this.billingForm.plans[plan.key]) {
            this.billingForm.plans[plan.key] = {
              monthlyPriceLkr:
                plan.key === 'FREEMIUM' ? 0 : plan.key === 'STARTER' ? 4000 : plan.key === 'GROWTH' ? 12000 : null,
              seats: plan.seats,
            };
          }
        }
      },
    });

    this.tenantConfigurationService.listPlatformPlans().subscribe({
      next: (rows) => {
        if (rows.length) {
          this.plans = rows;
        }
      },
    });
  }

  planRow(key: string) {
    return this.billingForm.plans[key] ?? { monthlyPriceLkr: 0, seats: null };
  }

  createModule(): void {
    if (!this.moduleForm.key.trim() || !this.moduleForm.label.trim()) {
      this.errorMessage = 'Module key and label are required.';
      return;
    }

    this.savingModule = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantConfigurationService
      .createPlatformModule({
        key: this.moduleForm.key.trim(),
        label: this.moduleForm.label.trim(),
        description: this.moduleForm.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.moduleForm = { key: '', label: '', description: '' };
          this.successMessage = 'Module added to platform catalog.';
          this.loadAll();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create module.';
          this.savingModule = false;
        },
        complete: () => {
          this.savingModule = false;
        },
      });
  }

  createField(): void {
    if (!this.selectedModuleKey || !this.fieldForm.fieldKey.trim() || !this.fieldForm.label.trim()) {
      this.errorMessage = 'Select a module and provide field key and label.';
      return;
    }

    this.savingField = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantConfigurationService
      .createPlatformField(this.selectedModuleKey, {
        fieldKey: this.fieldForm.fieldKey.trim(),
        label: this.fieldForm.label.trim(),
        fieldType: this.fieldForm.fieldType,
      })
      .subscribe({
        next: () => {
          this.fieldForm = { fieldKey: '', label: '', fieldType: 'text' };
          this.successMessage = 'Field added to platform catalog.';
          this.loadAll();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create field.';
          this.savingField = false;
        },
        complete: () => {
          this.savingField = false;
        },
      });
  }

  saveBilling(): void {
    this.savingBilling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantConfigurationService.savePlatformBilling(this.billingForm).subscribe({
      next: (billing) => {
        this.billingForm = billing as PlatformBillingConfig;
        this.successMessage = 'Billing configuration saved. Company Payments will use these prices.';
        this.savingBilling = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save billing configuration.';
        this.savingBilling = false;
      },
    });
  }
}
