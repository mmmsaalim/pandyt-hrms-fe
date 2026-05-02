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

  updateStatus(id: string, status: LeaveStatus) {
    return this.http.patch(`${environment.apiUrl}/leave/${id}`, { status });
  }
}
