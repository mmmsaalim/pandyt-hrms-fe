import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CanteenMealTypeConfig, MealBreakdown } from '../constants/canteen.constants';

@Injectable({ providedIn: 'root' })
export class CanteenService {
  constructor(private readonly http: HttpClient) {}

  list(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get(`${environment.apiUrl}/canteen${query}`);
  }

  listEligible(date: string) {
    return this.http.get(`${environment.apiUrl}/canteen/eligible?date=${encodeURIComponent(date)}`);
  }

  getSettings() {
    return this.http.get(`${environment.apiUrl}/canteen/settings`);
  }

  saveSettings(dto: {
    defaultMealCost: number;
    salaryDeduct: boolean;
    enabled: boolean;
    notes?: string;
    autoAssignFromAttendance?: boolean;
    mealTypes?: CanteenMealTypeConfig[];
    defaultMealCounts?: Record<string, number>;
  }) {
    return this.http.put(`${environment.apiUrl}/canteen/settings`, dto);
  }

  saveEntry(dto: {
    employeeId: number;
    date: string;
    mealCount?: number;
    mealCost?: number;
    mealBreakdown?: MealBreakdown;
    deductFromSalary?: boolean;
    notes?: string;
  }) {
    return this.http.post(`${environment.apiUrl}/canteen/entries`, dto);
  }

  autoGenerate(date: string) {
    return this.http.post(`${environment.apiUrl}/canteen/auto-generate?date=${encodeURIComponent(date)}`, {});
  }
}
