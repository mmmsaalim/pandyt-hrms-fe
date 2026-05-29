import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/leave`);
  }

  apply(dto: { type: string; startDate: string; endDate: string; days: number; reason: string }) {
    return this.http.post(`${environment.apiUrl}/leave`, dto);
  }

  updateStatus(id: string, status: LeaveStatus) {
    return this.http.patch(`${environment.apiUrl}/leave/${id}`, { status });
  }

  getPolicies() {
    return this.http.get(`${environment.apiUrl}/leave/policies`);
  }

  getBalances(employeeId?: number) {
    const params = employeeId ? `?employeeId=${employeeId}` : '';
    return this.http.get(`${environment.apiUrl}/leave/balances${params}`);
  }
}
