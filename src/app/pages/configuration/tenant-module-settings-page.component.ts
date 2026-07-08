import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TenantConfigurationModule,
  TenantConfigurationResponse,
  TenantConfigurationService,
} from '../../core/services/tenant-configuration.service';
import { MODULE_LABELS } from '../../core/constants/subscription-plans';
import { PAYSLIP_TEMPLATE_OPTIONS } from '../../core/constants/payslip-templates';
import { SHOW_WORKSPACE_TEMPLATE_SETTINGS } from '../../core/constants/workspace-settings.flags';

@Component({
  selector: 'app-tenant-module-settings-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './tenant-module-settings-page.component.html',
  styleUrl: './tenant-module-settings-page.component.scss',
})
export class TenantModuleSettingsPageComponent implements OnInit {
  readonly showTemplateSettings = SHOW_WORKSPACE_TEMPLATE_SETTINGS;
  readonly payslipTemplates = PAYSLIP_TEMPLATE_OPTIONS;

  loading = true;
  saving = false;
  savingField = false;
  errorMessage = '';
  successMessage = '';
  config: TenantConfigurationResponse | null = null;
  readonly moduleLabels = MODULE_LABELS;

  selectedModuleKey = '';
  fieldForm = { fieldKey: '', label: '', fieldType: 'text' };
  letterhead = { companyDisplayName: '', address: '', phone: '', email: '', logoUrl: '' };
  reportTemplates: Array<{ id: string; name: string; type: string; content: string }> = [];
  payslipTemplateKey = 'STANDARD_LKR';
  moduleFeatures: Record<string, Record<string, { enabled: boolean; required: boolean }>> = {};

  newReportTemplate = { name: '', type: 'HEADCOUNT', content: '' };

  constructor(private readonly tenantConfigurationService: TenantConfigurationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.tenantConfigurationService.getOwnTenantConfiguration().subscribe({
      next: (payload) => {
        this.config = payload;
        this.selectedModuleKey = payload.modules[0]?.key ?? '';
        if (this.showTemplateSettings) {
          const cfg = payload.config as Record<string, unknown>;
          const letterheadRaw = (cfg['letterhead'] ?? {}) as Record<string, string>;
          this.letterhead = {
            companyDisplayName: letterheadRaw['companyDisplayName'] ?? '',
            address: letterheadRaw['address'] ?? '',
            phone: letterheadRaw['phone'] ?? '',
            email: letterheadRaw['email'] ?? '',
            logoUrl: letterheadRaw['logoUrl'] ?? '',
          };
          this.reportTemplates = Array.isArray(cfg['reportTemplates'])
            ? (cfg['reportTemplates'] as Array<{ id: string; name: string; type: string; content: string }>)
            : [];
          this.payslipTemplateKey = String(cfg['payslipTemplateKey'] ?? 'STANDARD_LKR');
        }
        this.moduleFeatures = this.buildModuleFeatures(payload.modules);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load workspace module settings.';
        this.loading = false;
      },
    });
  }

  private buildModuleFeatures(modules: TenantConfigurationModule[]) {
    const output: Record<string, Record<string, { enabled: boolean; required: boolean }>> = {};
    for (const module of modules) {
      output[module.key] = {};
      for (const field of module.fields) {
        output[module.key][field.fieldKey] = {
          enabled: field.enabled,
          required: field.required,
        };
      }
    }
    return output;
  }

  selectedModule(): TenantConfigurationModule | undefined {
    return this.config?.modules.find((module) => module.key === this.selectedModuleKey);
  }

  moduleLabel(key: string): string {
    return this.moduleLabels[key] ?? key;
  }

  toggleField(moduleKey: string, fieldKey: string, key: 'enabled' | 'required', checked: boolean): void {
    if (!this.moduleFeatures[moduleKey]) {
      this.moduleFeatures[moduleKey] = {};
    }
    if (!this.moduleFeatures[moduleKey][fieldKey]) {
      this.moduleFeatures[moduleKey][fieldKey] = { enabled: false, required: false };
    }
    this.moduleFeatures[moduleKey][fieldKey][key] = checked;
    if (key === 'enabled' && !checked) {
      this.moduleFeatures[moduleKey][fieldKey].required = false;
    }
  }

  isFieldEnabled(moduleKey: string, fieldKey: string): boolean {
    return this.moduleFeatures[moduleKey]?.[fieldKey]?.enabled ?? false;
  }

  isFieldRequired(moduleKey: string, fieldKey: string): boolean {
    return this.moduleFeatures[moduleKey]?.[fieldKey]?.required ?? false;
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
      .createTenantCustomField(this.selectedModuleKey, {
        fieldKey: this.fieldForm.fieldKey.trim(),
        label: this.fieldForm.label.trim(),
        fieldType: this.fieldForm.fieldType,
      })
      .subscribe({
        next: (payload) => {
          this.config = payload;
          this.moduleFeatures = this.buildModuleFeatures(payload.modules);
          this.fieldForm = { fieldKey: '', label: '', fieldType: 'text' };
          this.successMessage = 'Custom field added to your subscribed module.';
          this.savingField = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to add custom field.';
          this.savingField = false;
        },
      });
  }

  addReportTemplate(): void {
    const name = this.newReportTemplate.name.trim();
    if (!name) {
      this.errorMessage = 'Report template name is required.';
      return;
    }

    this.reportTemplates = [
      ...this.reportTemplates,
      {
        id: `tpl_${Date.now()}`,
        name,
        type: this.newReportTemplate.type,
        content: this.newReportTemplate.content.trim(),
      },
    ];
    this.newReportTemplate = { name: '', type: 'HEADCOUNT', content: '' };
    this.successMessage = 'Report template added locally. Save settings to persist.';
  }

  removeReportTemplate(id: string): void {
    this.reportTemplates = this.reportTemplates.filter((item) => item.id !== id);
  }

  save(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: Parameters<TenantConfigurationService['saveOwnTenantConfiguration']>[0] = {
      moduleFeatures: this.moduleFeatures,
    };

    if (this.showTemplateSettings) {
      payload.letterhead = this.letterhead;
      payload.reportTemplates = this.reportTemplates;
      payload.payslipTemplateKey = this.payslipTemplateKey;
    }

    this.tenantConfigurationService.saveOwnTenantConfiguration(payload).subscribe({
      next: (saved) => {
        this.config = saved;
        this.moduleFeatures = this.buildModuleFeatures(saved.modules);
        this.successMessage = 'Workspace module settings saved.';
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save workspace settings.';
        this.saving = false;
      },
    });
  }
}
