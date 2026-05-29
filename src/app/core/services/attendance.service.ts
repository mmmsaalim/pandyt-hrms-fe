import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/attendance`);
  }

  clockIn() {
    return this.http.post(`${environment.apiUrl}/attendance/clock-in`, {});
  }

  clockOut() {
    return this.http.post(`${environment.apiUrl}/attendance/clock-out`, {});
  }

  override(dto: { employeeId: number; date: string; clockIn?: string; clockOut?: string; reason: string }) {
    return this.http.post(`${environment.apiUrl}/attendance/override`, dto);
  }
}
