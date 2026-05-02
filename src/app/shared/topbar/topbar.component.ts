import { Component, Input } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() toggleSidebar: { emit: () => void } = { emit: () => {} };

  constructor(public readonly auth: AuthService) {}
}
