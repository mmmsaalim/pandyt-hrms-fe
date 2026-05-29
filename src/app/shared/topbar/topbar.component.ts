import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() toggleSidebar: { emit: () => void } = { emit: () => {} };

  constructor(public readonly auth: AuthService) {}

  get displayName(): string {
    const user = this.auth.user();
    if (!user) return 'Guest User';
    return `${user.firstName} ${user.lastName}`.trim();
  }

  get displayEmail(): string {
    return this.auth.user()?.email ?? '';
  }
}
