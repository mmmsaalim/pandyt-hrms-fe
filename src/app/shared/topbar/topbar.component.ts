import { Component, Input } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() toggleSidebar: { emit: () => void } = { emit: () => {} };
  profileOpen = false;
  profileLoading = false;
  employeeProfile: any | null = null;

  constructor(
    public readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  get displayName(): string {
    const user = this.auth.user();
    if (!user) return 'Guest User';
    return `${user.firstName} ${user.lastName}`.trim();
  }

  get displayEmail(): string {
    return this.auth.user()?.email ?? '';
  }

  get companyName(): string {
    return this.auth.user()?.tenantName?.trim() ?? '';
  }

  openProfile(): void {
    this.profileOpen = true;
    this.profileLoading = true;
    this.employeesService.getMe().subscribe({
      next: (profile) => {
        this.employeeProfile = profile;
        this.profileLoading = false;
      },
      error: () => {
        this.employeeProfile = null;
        this.profileLoading = false;
      },
    });
  }

  closeProfile(): void {
    this.profileOpen = false;
  }
}
