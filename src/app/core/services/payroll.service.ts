import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/payroll`);
  }

  create(period: string) {
    return this.http.post(`${environment.apiUrl}/payroll`, { period });
  }

  process(id: number) {
    return this.http.post(`${environment.apiUrl}/payroll/${id}/process`, {});
  }

  remove(id: number) {
    return this.http.delete(`${environment.apiUrl}/payroll/${id}`);
  }
}
