import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganisationService } from '../../core/services/organisation.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-organisation-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule],
  templateUrl: './organisation-page.component.html',
  styleUrl: './organisation-page.component.scss',
})
export class OrganisationPageComponent implements OnInit {
  tree: any[] = [];
  locations: any[] = [];
  departments: any[] = [];
  teams: any[] = [];

  isCompanyAdmin = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  activeTab: 'tree' | 'locations' | 'departments' | 'teams' = 'tree';

  showLocationForm = false;
  locationForm = { name: '', address: '' };

  showDepartmentForm = false;
  departmentForm = { name: '', locationId: 0 };

  showTeamForm = false;
  teamForm = { name: '', departmentId: 0 };

  constructor(
    private readonly orgService: OrganisationService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isCompanyAdmin = this.auth.user()?.roles.includes('COMPANY_ADMIN') ?? false;
    this.loadAll();
  }

  loadAll(): void {
    this.orgService.getTree().subscribe((res: any) => (this.tree = res));
    this.orgService.getLocations().subscribe((res: any) => (this.locations = res));
    this.orgService.getDepartments().subscribe((res: any) => (this.departments = res));
    this.orgService.getTeams().subscribe((res: any) => (this.teams = res));
  }

  createLocation(): void {
    if (!this.locationForm.name.trim()) { this.showMsg('Name is required.', 'error'); return; }
    this.orgService.createLocation({ name: this.locationForm.name.trim(), address: this.locationForm.address.trim() || undefined }).subscribe({
      next: () => { this.showMsg('Location created.', 'success'); this.locationForm = { name: '', address: '' }; this.showLocationForm = false; this.loadAll(); },
      error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
    });
  }

  createDepartment(): void {
    if (!this.departmentForm.name.trim()) { this.showMsg('Name is required.', 'error'); return; }
    this.orgService.createDepartment({ name: this.departmentForm.name.trim(), locationId: this.departmentForm.locationId || undefined }).subscribe({
      next: () => { this.showMsg('Department created.', 'success'); this.departmentForm = { name: '', locationId: 0 }; this.showDepartmentForm = false; this.loadAll(); },
      error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
    });
  }

  createTeam(): void {
    if (!this.teamForm.name.trim() || !this.teamForm.departmentId) { this.showMsg('Name and department are required.', 'error'); return; }
    this.orgService.createTeam({ name: this.teamForm.name.trim(), departmentId: this.teamForm.departmentId }).subscribe({
      next: () => { this.showMsg('Team created.', 'success'); this.teamForm = { name: '', departmentId: 0 }; this.showTeamForm = false; this.loadAll(); },
      error: (err) => this.showMsg(err?.error?.message || 'Failed.', 'error'),
    });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
  }
}
