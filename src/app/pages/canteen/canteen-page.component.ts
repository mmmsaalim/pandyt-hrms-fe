import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanteenService } from '../../core/services/canteen.service';
import {
  CanteenMealTypeConfig,
  DEFAULT_CANTEEN_MEAL_TYPES,
  DEFAULT_MEAL_COUNTS,
  MealBreakdown,
  resolveDefaultMealCounts,
  resolveMealTypes,
} from '../../core/constants/canteen.constants';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-canteen-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, DatePipe],
  templateUrl: './canteen-page.component.html',
  styleUrl: './canteen-page.component.scss',
})
export class CanteenPageComponent implements OnInit {
  rows: any[] = [];
  eligibleEmployees: Array<{ id: number; name: string; email: string; employeeCode?: string }> = [];
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  canManage = false;
  selectedMealKey = '';

  filterDate = new Date().toISOString().slice(0, 10);
  settings = {
    enabled: true,
    defaultMealCost: 0,
    salaryDeduct: false,
    autoAssignFromAttendance: false,
    notes: '',
    mealTypes: DEFAULT_CANTEEN_MEAL_TYPES.map((row) => ({ ...row })),
    defaultMealCounts: { ...DEFAULT_MEAL_COUNTS },
  };
  entryForm = {
    employeeId: 0,
    date: this.filterDate,
    deductFromSalary: false,
    notes: '',
    mealBreakdown: {} as MealBreakdown,
  };

  constructor(
    private readonly canteenService: CanteenService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.canManage = roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER') || roles.includes('TEAM_LEAD');
    this.loadSettings();
    this.onDateChange();
  }

  allMealTypes(): CanteenMealTypeConfig[] {
    return this.settings.mealTypes.length
      ? this.settings.mealTypes
      : DEFAULT_CANTEEN_MEAL_TYPES.map((row) => ({ ...row }));
  }

  enabledMealTypes(): CanteenMealTypeConfig[] {
    return this.allMealTypes().filter((row) => row.enabled);
  }

  onDateChange(): void {
    this.entryForm.date = this.filterDate;
    this.loadRows();
    this.loadEligibleEmployees();
  }

  loadRows(): void {
    this.canteenService.list(this.filterDate).subscribe((rows: any) => (this.rows = Array.isArray(rows) ? rows : []));
  }

  loadEligibleEmployees(): void {
    this.canteenService.listEligible(this.filterDate).subscribe({
      next: (rows: any) => {
        this.eligibleEmployees = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: Number(row.id),
          name: `${row?.user?.firstName ?? ''} ${row?.user?.lastName ?? ''}`.trim() || `Employee #${row.id}`,
          email: row?.user?.email ?? 'No email',
          employeeCode: row?.employeeCode,
        }));
      },
      error: () => {
        this.eligibleEmployees = [];
      },
    });
  }

  loadSettings(): void {
    this.canteenService.getSettings().subscribe({
      next: (settings: any) => {
        this.applySettings(settings);
      },
      error: () => {
        this.applySettings(null);
      },
    });
  }

  private applySettings(settings: any | null): void {
    this.settings = {
      enabled: settings?.enabled ?? true,
      defaultMealCost: Number(settings?.defaultMealCost ?? 0),
      salaryDeduct: settings?.salaryDeduct ?? false,
      autoAssignFromAttendance: settings?.autoAssignFromAttendance ?? false,
      notes: settings?.notes ?? '',
      mealTypes: resolveMealTypes(settings?.mealTypes),
      defaultMealCounts: resolveDefaultMealCounts(settings?.defaultMealCounts),
    };
    this.entryForm.deductFromSalary = this.settings.salaryDeduct;
    this.resetEntryBreakdown();
  }

  resetEntryBreakdown(): void {
    const breakdown: MealBreakdown = {};
    for (const mealType of this.allMealTypes()) {
      breakdown[mealType.key] = {
        count: mealType.enabled ? Number(this.settings.defaultMealCounts[mealType.key] ?? 0) : 0,
        cost: Number(mealType.defaultCost ?? 0),
      };
    }
    this.entryForm.mealBreakdown = breakdown;
    this.selectedMealKey = '';
  }

  onMealDropdownChange(key: string): void {
    if (!key) {
      return;
    }

    const mealType = this.allMealTypes().find((row) => row.key === key);
    if (!mealType) {
      return;
    }

    mealType.enabled = true;
    this.setMealCount(key, Math.max(1, this.mealCountFor(key)));
    this.setMealCost(key, Number(mealType.defaultCost ?? 0));
    this.selectedMealKey = key;
  }

  mealCountFor(key: string): number {
    return Number(this.entryForm.mealBreakdown[key]?.count ?? 0);
  }

  setMealCount(key: string, value: number): void {
    if (!this.entryForm.mealBreakdown[key]) {
      const mealType = this.allMealTypes().find((row) => row.key === key);
      this.entryForm.mealBreakdown[key] = { count: 0, cost: Number(mealType?.defaultCost ?? 0) };
    }
    this.entryForm.mealBreakdown[key].count = Math.max(0, Math.floor(Number(value) || 0));
  }

  mealCostFor(key: string): number {
    return Number(this.entryForm.mealBreakdown[key]?.cost ?? 0);
  }

  setMealCost(key: string, value: number): void {
    if (!this.entryForm.mealBreakdown[key]) {
      this.entryForm.mealBreakdown[key] = { count: 0, cost: value };
    }
    this.entryForm.mealBreakdown[key].cost = Math.max(0, Number(value) || 0);
  }

  mealSummary(row: any): string {
    const breakdown = row?.mealBreakdown;
    if (breakdown && typeof breakdown === 'object') {
      return Object.entries(breakdown as MealBreakdown)
        .filter(([, value]) => Number((value as MealBreakdown[string]).count) > 0)
        .map(([key, value]) => {
          const label = this.allMealTypes().find((meal) => meal.key === key)?.label ?? key;
          return `${label}: ${(value as MealBreakdown[string]).count}`;
        })
        .join(', ');
    }

    return String(row?.mealCount ?? 0);
  }

  saveSettings(): void {
    if (!this.canManage) {
      return;
    }

    this.busy = true;
    this.canteenService.saveSettings(this.settings).subscribe({
      next: (settings: any) => {
        this.applySettings(settings);
        this.showMessage('Canteen settings saved.', 'success');
      },
      error: (err) => this.showMessage(err?.error?.message || 'Failed to save canteen settings.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  saveEntry(): void {
    if (!this.entryForm.employeeId || !this.entryForm.date) {
      this.showMessage('Employee and date are required.', 'error');
      return;
    }

    const hasMeals = Object.values(this.entryForm.mealBreakdown).some(
      (row) => Number((row as MealBreakdown[string]).count) > 0,
    );
    if (!hasMeals) {
      this.showMessage('Select at least one meal type (Breakfast, Lunch, Dinner, Tea, etc.).', 'error');
      return;
    }

    this.busy = true;
    this.canteenService.saveEntry(this.entryForm).subscribe({
      next: () => {
        this.showMessage('Meal entry saved.', 'success');
        this.loadRows();
      },
      error: (err) => this.showMessage(err?.error?.message || 'Failed to save meal entry.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  autoGenerate(): void {
    this.busy = true;
    this.canteenService.autoGenerate(this.filterDate).subscribe({
      next: (result: any) => {
        this.showMessage(
          `Generated ${result?.created ?? 0} entries for ${result?.eligibleCount ?? 0} attended employees.`,
          'success',
        );
        this.loadRows();
      },
      error: (err) => this.showMessage(err?.error?.message || 'Failed to auto-generate canteen entries.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
