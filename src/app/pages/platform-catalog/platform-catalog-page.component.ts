import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlatformBillingConfig,
  PlatformModuleDefinition,
  PlatformPlanDefinition,
  TenantConfigurationService,
} from '../../core/services/tenant-configuration.service';

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
  planCatalog: PlatformPlanDefinition[] = [];
  billingForm: PlatformBillingConfig = {
    taxRate: 0.18,
    overageSeatPriceLkr: 500,
    plans: {},
  };

  loading = false;
  savingField = false;
  savingBilling = false;
  savingPlans = false;
  errorMessage = '';
  successMessage = '';
  selectedModuleKey = '';

  fieldForm = { fieldKey: '', label: '', fieldType: 'text' };
  newPlanForm = {
    key: '',
    label: '',
    seats: 50,
    priceLkr: 0,
    description: '',
    defaultModules: [] as string[],
  };

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
    this.errorMessage = '';

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

    this.tenantConfigurationService.loadPlatformPlans().subscribe({
      next: (rows) => {
        this.planCatalog = rows.map((plan) => ({
          ...plan,
          defaultModules: plan.defaultModules ?? [],
        }));
        this.tenantConfigurationService.getPlatformBilling().subscribe({
          next: (billing) => {
            this.billingForm = billing as PlatformBillingConfig;
            for (const plan of this.planCatalog) {
              if (!this.billingForm.plans[plan.key]) {
                this.billingForm.plans[plan.key] = {
                  monthlyPriceLkr: plan.priceLkr,
                  seats: plan.seats,
                };
              }
            }
          },
        });
      },
    });
  }

  isModuleSelected(plan: PlatformPlanDefinition, moduleKey: string): boolean {
    return (plan.defaultModules ?? []).includes(moduleKey);
  }

  togglePlanModule(plan: PlatformPlanDefinition, moduleKey: string, checked: boolean): void {
    const current = new Set(plan.defaultModules ?? []);
    if (checked) {
      current.add(moduleKey);
    } else {
      current.delete(moduleKey);
    }
    plan.defaultModules = Array.from(current);
  }

  toggleNewPlanModule(moduleKey: string, checked: boolean): void {
    const current = new Set(this.newPlanForm.defaultModules);
    if (checked) {
      current.add(moduleKey);
    } else {
      current.delete(moduleKey);
    }
    this.newPlanForm.defaultModules = Array.from(current);
  }

  addPlan(): void {
    const key = this.newPlanForm.key.trim().toUpperCase();
    const label = this.newPlanForm.label.trim();

    if (!key || !label) {
      this.errorMessage = 'Plan key and label are required.';
      return;
    }

    if (this.planCatalog.some((plan) => plan.key === key)) {
      this.errorMessage = `Plan "${key}" already exists.`;
      return;
    }

    this.planCatalog = [
      ...this.planCatalog,
      {
        key,
        label,
        seats: this.newPlanForm.seats,
        priceLkr: this.newPlanForm.priceLkr,
        description: this.newPlanForm.description.trim(),
        defaultModules: [...this.newPlanForm.defaultModules],
        sortOrder: this.planCatalog.length + 1,
        isActive: true,
      },
    ];

    this.billingForm.plans[key] = {
      monthlyPriceLkr: this.newPlanForm.priceLkr,
      seats: this.newPlanForm.seats,
    };

    this.newPlanForm = {
      key: '',
      label: '',
      seats: 50,
      priceLkr: 0,
      description: '',
      defaultModules: [],
    };
    this.successMessage = 'Plan added locally. Click "Save plan catalog" to persist to the database.';
  }

  savePlanCatalog(): void {
    this.savingPlans = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.planCatalog.map((plan) => ({
      ...plan,
      priceLkr: this.billingForm.plans[plan.key]?.monthlyPriceLkr ?? plan.priceLkr,
      seats: plan.seats ?? this.billingForm.plans[plan.key]?.seats ?? null,
    }));

    this.tenantConfigurationService.savePlatformPlans(payload).subscribe({
      next: () => {
        this.tenantConfigurationService.loadPlatformPlans().subscribe({
          next: (rows) => {
            this.planCatalog = rows.map((plan) => ({
              ...plan,
              defaultModules: plan.defaultModules ?? [],
            }));
          },
        });
        this.successMessage = 'Subscription plan catalog saved to platform settings.';
        this.savingPlans = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save subscription plan catalog.';
        this.savingPlans = false;
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
