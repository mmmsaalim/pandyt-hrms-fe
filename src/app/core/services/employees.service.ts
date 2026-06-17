import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type InviteRole = 'EMPLOYEE' | 'TEAM_LEAD' | 'HR_MANAGER' | 'COMPANY_ADMIN';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/employees`);
  }

  getMe() {
    return this.http.get(`${environment.apiUrl}/employees/me`);
  }

  updateMe(dto: {
    designation?: string;
    employmentStatus?: 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE';
    customFields?: Record<string, unknown>;
  }) {
    return this.http.patch(`${environment.apiUrl}/employees/me`, dto);
  }

  inviteEmployee(dto: {
    name: string;
    workEmail: string;
    department?: string;
    departmentId?: number;
    teamId?: number;
    locationId?: number;
    designation: string;
    role: InviteRole;
    employeeCode?: string;
    customFields?: Record<string, unknown>;
  }) {
    return this.http.post(`${environment.apiUrl}/employees/invite`, dto);
  }

  updateEmployee(
    id: number,
    dto: {
      department?: string;
      departmentId?: number;
      teamId?: number | null;
      locationId?: number | null;
      designation?: string;
      joinedDate?: string;
      employmentStatus?: 'ACTIVE' | 'ON_PROBATION' | 'INACTIVE';
      salary?: number;
      customFields?: Record<string, unknown>;
    },
  ) {
    return this.http.patch(`${environment.apiUrl}/employees/${id}`, dto);
  }

  deleteEmployee(id: number) {
    return this.http.delete(`${environment.apiUrl}/employees/${id}`);
  }

  anonymizeEmployee(id: number) {
    return this.http.post(`${environment.apiUrl}/employees/${id}/anonymize`, {});
  }

  exportEmployee(id: number) {
    return this.http.get(`${environment.apiUrl}/employees/${id}/export-data`);
  }

  updateSalary(id: number, salary: number) {
    return this.http.patch(`${environment.apiUrl}/employees/${id}`, { salary });
  }
}
