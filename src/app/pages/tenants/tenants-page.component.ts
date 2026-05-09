import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../core/services/tenants.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
})
export class TenantsPageComponent implements OnInit {
  rows: any[] = [];
  showCreateForm = false;
  creating = false;
  errorMessage = '';
  successMessage = '';
  form = {
    companyName: '',
    adminName: '',
    adminEmail: '',
    subscriptionPlan: 'BASIC',
    seats: 25,
  };

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.showCreateForm = params.get('new') === '1';
    });

    this.loadRows();
  }

  loadRows(): void {
    this.tenantsService.list().subscribe((res: any) => (this.rows = res));
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.showCreateForm = true;
  }

  createTenant(): void {
    if (!this.form.companyName.trim() || !this.form.adminName.trim() || !this.form.adminEmail.trim()) {
      this.errorMessage = 'Company name, admin name, and admin email are required.';
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService
      .onboardCompany({
        companyName: this.form.companyName.trim(),
        adminName: this.form.adminName.trim(),
        adminEmail: this.form.adminEmail.trim(),
        subscriptionPlan: this.form.subscriptionPlan.trim() || 'BASIC',
        seats: Number(this.form.seats) || 1,
      })
      .subscribe({
        next: (res: any) => {
          this.form = {
            companyName: '',
            adminName: '',
            adminEmail: '',
            subscriptionPlan: 'BASIC',
            seats: 25,
          };
          this.showCreateForm = false;
          this.successMessage = `Invitation sent to ${res?.adminUser?.email || 'company admin'}.`;
          this.loadRows();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to create tenant.';
          this.creating = false;
        },
        complete: () => {
          this.creating = false;
        },
      });
  }
}
