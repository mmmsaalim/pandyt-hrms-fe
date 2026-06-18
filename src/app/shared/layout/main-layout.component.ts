import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [NgIf, RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = false;

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.auth.refreshTenantConfig().subscribe({
      next: (config) => this.auth.applyTenantConfig(config),
      error: () => undefined,
    });
  }

  get pageTitle() {
    const segment = this.router.url.split('/')[1] || 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  readonly toggleSidebar = {
    emit: () => {
      this.sidebarOpen = !this.sidebarOpen;
    },
  };
}
