import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveService } from '../../core/services/leave.service';

interface LeaveBalance {
  id: number;
  leavePolicy?: { name: string };
  allocated: number;
  used: number;
  accrued: number;
  available?: number;
}

@Component({
  selector: 'app-leave-balance-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="leave-balance-section">
      <div class="section-header">
        <h3>Leave Balance</h3>
        <button (click)="toggle()" class="toggle-btn" [title]="isExpanded ? 'Collapse' : 'Expand'">
          <span class="arrow" [class.expanded]="isExpanded">▼</span>
        </button>
      </div>

      <div *ngIf="isExpanded" class="balance-content">
        <p *ngIf="loading" class="loading">Loading balances...</p>
        <p *ngIf="error" class="error">{{ error }}</p>

        <div *ngIf="!loading && balances.length" class="balance-grid">
          <div *ngFor="let bal of balances" class="balance-card" [ngClass]="getThemeClass(bal.leavePolicy?.name)">
            <div class="card-header-row">
              <div class="icon-container" [innerHTML]="getIcon(bal.leavePolicy?.name)"></div>
              <span class="policy-name">{{ bal.leavePolicy?.name || 'Leave Type' }}</span>
            </div>
            
            <div class="card-body">
              <div class="days-large">
                <span class="days-num">{{ getAvailable(bal) | number: '1.0-1' }}</span>
                <span class="days-unit">Days</span>
              </div>
              <div class="days-status">Available</div>
            </div>

            <div class="card-footer">
              <div class="progress-wrapper">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getPercentage(bal.used, bal.allocated)"></div>
                </div>
              </div>
              <div class="breakdown">
                <span class="used-val">Used: <strong>{{ bal.used | number: '1.0-1' }}</strong></span>
                <span class="divider">/</span>
                <span class="allocated-val">Total: <strong>{{ bal.allocated | number: '1.0-1' }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <p *ngIf="!loading && !balances.length" class="empty">No leave policies configured yet.</p>
      </div>
    </section>
  `,
  styles: [`
    .leave-balance-section {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid var(--border, #ecd8cb);
      border-radius: 18px;
      padding: 24px;
      margin: 16px 0 24px 0;
      box-shadow: var(--shadow, 0 18px 40px rgba(63, 34, 15, 0.08));
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(236, 216, 203, 0.5);
      padding-bottom: 12px;
    }
    
    .section-header h3 {
      margin: 0;
      font-family: var(--font-display, 'Sora', sans-serif);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text, #1d2430);
    }
    
    .toggle-btn {
      background: #fff5ee;
      border: 1px solid var(--border, #ecd8cb);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: var(--brand, #f47421);
      transition: all 0.2s ease;
    }
    
    .toggle-btn:hover {
      background: var(--brand-soft, #ffe1cf);
      transform: scale(1.05);
    }
    
    .arrow {
      display: inline-block;
      font-size: 10px;
      transition: transform 0.3s ease;
    }
    
    .arrow.expanded {
      transform: rotate(0deg);
    }
    
    .arrow:not(.expanded) {
      transform: rotate(-90deg);
    }
    
    .balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }
    
    .balance-card {
      position: relative;
      background: #ffffff;
      border: 1px solid #f1e4dc;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(63, 34, 15, 0.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .balance-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 28px rgba(63, 34, 15, 0.08);
      border-color: var(--brand-soft-strong, #ffd0b3);
    }
    
    /* Dynamic Theme Styles with Top Highlight lines */
    .balance-card.theme-annual { border-top: 4px solid var(--brand, #f47421); }
    .balance-card.theme-sick { border-top: 4px solid #f43f5e; }
    .balance-card.theme-medical { border-top: 4px solid #0d9488; }
    .balance-card.theme-casual { border-top: 4px solid #4f46e5; }
    .balance-card.theme-default { border-top: 4px solid #64748b; }
    
    .card-header-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    
    .balance-card:hover .icon-container {
      transform: scale(1.1);
    }
    
    .icon-container ::ng-deep svg {
      width: 20px;
      height: 20px;
    }
    
    /* Card Theme Colors */
    .theme-annual .icon-container { background: #ffe1cf; color: var(--brand, #f47421); }
    .theme-sick .icon-container { background: #ffe4e6; color: #f43f5e; }
    .theme-medical .icon-container { background: #ccfbf1; color: #0d9488; }
    .theme-casual .icon-container { background: #e0e7ff; color: #4f46e5; }
    .theme-default .icon-container { background: #f1f5f9; color: #64748b; }
    
    .policy-name {
      font-family: var(--font-display, 'Sora', sans-serif);
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text, #1d2430);
    }
    
    .card-body {
      margin-bottom: 20px;
    }
    
    .days-large {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    
    .days-num {
      font-family: var(--font-display, 'Sora', sans-serif);
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1;
      color: var(--text, #1d2430);
    }
    
    .days-unit {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--muted, #667085);
    }
    
    .days-status {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted, #667085);
      margin-top: 4px;
    }
    
    .card-footer {
      margin-top: auto;
    }
    
    .progress-wrapper {
      margin-bottom: 8px;
    }
    
    .progress-bar {
      height: 6px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .theme-annual .progress-fill { background: linear-gradient(90deg, var(--brand, #f47421), #ff9248); }
    .theme-sick .progress-fill { background: linear-gradient(90deg, #f43f5e, #fb7185); }
    .theme-medical .progress-fill { background: linear-gradient(90deg, #0d9488, #14b8a6); }
    .theme-casual .progress-fill { background: linear-gradient(90deg, #4f46e5, #6366f1); }
    .theme-default .progress-fill { background: linear-gradient(90deg, #64748b, #94a3b8); }
    
    .breakdown {
      display: flex;
      align-items: center;
      font-size: 0.8rem;
      color: var(--muted, #667085);
      font-weight: 500;
    }
    
    .breakdown strong {
      color: var(--text, #1d2430);
      font-weight: 700;
    }
    
    .divider {
      margin: 0 6px;
      color: #e0e0e0;
    }
    
    .loading, .error, .empty {
      font-size: 0.9rem;
      color: var(--muted, #667085);
      text-align: center;
      padding: 16px;
    }
    
    .error {
      color: #f43f5e;
      background: #fff1f2;
      border-radius: 8px;
      border: 1px solid #ffe4e6;
    }
  `],
})
export class LeaveBalanceDisplayComponent implements OnInit {
  balances: LeaveBalance[] = [];
  loading = false;
  error = '';
  isExpanded = true;

  constructor(private readonly leaveService: LeaveService) {}

  ngOnInit(): void {
    this.loadBalances();
  }

  private loadBalances(): void {
    this.loading = true;
    this.error = '';
    this.leaveService.getBalances().subscribe({
      next: (data: any) => {
        this.balances = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load leave balances';
        this.loading = false;
      },
    });
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  getPercentage(used: number, allocated: number): number {
    if (!allocated) return 0;
    return Math.min((used / allocated) * 100, 100);
  }

  getAvailable(balance: LeaveBalance): number {
    return Math.max(balance.allocated - balance.used, 0);
  }

  getThemeClass(name: string | undefined): string {
    const term = (name || '').toLowerCase();
    if (term.includes('annual') || term.includes('vacation')) return 'theme-annual';
    if (term.includes('sick')) return 'theme-sick';
    if (term.includes('medical')) return 'theme-medical';
    if (term.includes('casual')) return 'theme-casual';
    return 'theme-default';
  }

  getIcon(name: string | undefined): string {
    const term = (name || '').toLowerCase();
    
    const annualIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>`;
    const sickIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;
    const medicalIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`;
    const casualIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>`;
    const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`;

    if (term.includes('annual') || term.includes('vacation')) return annualIcon;
    if (term.includes('sick')) return sickIcon;
    if (term.includes('medical')) return medicalIcon;
    if (term.includes('casual')) return casualIcon;
    return defaultIcon;
  }
}
