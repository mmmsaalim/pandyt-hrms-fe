import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/employees`);
  }

  inviteEmployee(dto: {
    name: string;
    workEmail: string;
    department: string;
    designation: string;
    role: 'EMPLOYEE' | 'COMPANY_ADMIN';
    employeeCode?: string;
  }) {
    return this.http.post(`${environment.apiUrl}/employees/invite`, dto);
  }
}
