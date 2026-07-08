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

  getSettings() {
    return this.http.get(`${environment.apiUrl}/attendance/settings`);
  }

  updateSettings(dto: Record<string, unknown>) {
    return this.http.patch(`${environment.apiUrl}/attendance/settings`, dto);
  }

  listShifts() {
    return this.http.get(`${environment.apiUrl}/attendance/shifts`);
  }

  createShift(dto: Record<string, unknown>) {
    return this.http.post(`${environment.apiUrl}/attendance/shifts`, dto);
  }

  updateShift(id: number, dto: Record<string, unknown>) {
    return this.http.patch(`${environment.apiUrl}/attendance/shifts/${id}`, dto);
  }

  deleteShift(id: number) {
    return this.http.delete(`${environment.apiUrl}/attendance/shifts/${id}`);
  }

  listHolidays() {
    return this.http.get(`${environment.apiUrl}/attendance/holidays`);
  }

  createHoliday(dto: { name: string; date: string; isRecurring?: boolean; isPaid?: boolean }) {
    return this.http.post(`${environment.apiUrl}/attendance/holidays`, dto);
  }

  deleteHoliday(id: number) {
    return this.http.delete(`${environment.apiUrl}/attendance/holidays/${id}`);
  }
}
