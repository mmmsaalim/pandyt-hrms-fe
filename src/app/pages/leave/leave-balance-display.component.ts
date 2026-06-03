import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveService } from '../../core/services/leave.service';

interface LeaveBalance {
  id: number;
  policy?: { name: string };
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
    <section class="leave-balance-card">
      <div class="card-header">
        <h3>Leave Balance</h3>
        <button *ngIf="isExpanded" (click)="toggle()" class="toggle-btn">▼</button>
        <button *ngIf="!isExpanded" (click)="toggle()" class="toggle-btn">▶</button>
      </div>

      <div *ngIf="isExpanded" class="balance-content">
        <p *ngIf="loading" class="loading">Loading balances...</p>
        <p *ngIf="error" class="error">{{ error }}</p>

        <div *ngIf="!loading && balances.length" class="balance-grid">
          <div *ngFor="let bal of balances" class="balance-item">
            <div class="policy-name">{{ bal.policy?.name || 'Leave Type' }}</div>
            <div class="balance-bars">
              <div class="bar-container">
                <div class="bar-label">Allocated: {{ bal.allocated | number: '1.0-0' }}</div>
                <div class="bar-bg">
                  <div class="bar-used" [style.width.%]="getPercentage(bal.used, bal.allocated)"></div>
                </div>
              </div>
              <div class="balance-summary">
                <span class="used">Used: {{ bal.used | number: '1.0-0' }}</span>
                <span class="available">Available: {{ getAvailable(bal) | number: '1.0-0' }}</span>
              </div>
            </div>
          </div>
        </div>

        <p *ngIf="!loading && !balances.length" class="empty">No leave policies configured yet.</p>
      </div>
    </section>
  `,
  styles: [`
    .leave-balance-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .card-header h3 {
      margin: 0;
      font-size: 16px;
    }
    .toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    .balance-content {
      margin-top: 12px;
    }
    .balance-grid {
      display: grid;
      gap: 12px;
    }
    .balance-item {
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .policy-name {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .bar-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    .bar-bg {
      width: 100%;
      height: 20px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-used {
      height: 100%;
      background: #4caf50;
      transition: width 0.3s;
    }
    .balance-summary {
      display: flex;
      gap: 16px;
      font-size: 12px;
      margin-top: 4px;
    }
    .used {
      color: #666;
    }
    .available {
      font-weight: bold;
      color: #2196f3;
    }
    .loading, .error, .empty {
      font-size: 13px;
      color: #666;
      text-align: center;
      padding: 8px;
    }
    .error {
      color: #f44336;
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
}
