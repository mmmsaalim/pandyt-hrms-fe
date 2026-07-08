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

  apply(dto: {
    employeeId?: number;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status?: LeaveStatus;
  }) {
    return this.http.post(`${environment.apiUrl}/leave`, dto);
  }

  updateStatus(
    id: string,
    status: LeaveStatus,
    options?: { rejectionReason?: string; approvalComment?: string },
  ) {
    return this.http.patch(`${environment.apiUrl}/leave/${id}`, {
      status,
      rejectionReason: options?.rejectionReason,
      approvalComment: options?.approvalComment,
    });
  }

  getPolicies() {
    return this.http.get(`${environment.apiUrl}/leave/policies`);
  }

  getBalances(employeeId?: number) {
    const params = employeeId ? `?employeeId=${employeeId}` : '';
    return this.http.get(`${environment.apiUrl}/leave/balances${params}`);
  }

  delete(id: string) {
    return this.http.delete(`${environment.apiUrl}/leave/${id}`);
  }
}
