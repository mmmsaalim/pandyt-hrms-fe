import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrganisationService {
  constructor(private readonly http: HttpClient) {}

  getTree() {
    return this.http.get(`${environment.apiUrl}/organisation/tree`);
  }

  getLocations() {
    return this.http.get(`${environment.apiUrl}/organisation/locations`);
  }

  createLocation(dto: { name: string; address?: string }) {
    return this.http.post(`${environment.apiUrl}/organisation/locations`, dto);
  }

  getDepartments() {
    return this.http.get(`${environment.apiUrl}/organisation/departments`);
  }

  createDepartment(dto: { name: string; locationId?: number }) {
    return this.http.post(`${environment.apiUrl}/organisation/departments`, dto);
  }

  getTeams() {
    return this.http.get(`${environment.apiUrl}/organisation/teams`);
  }

  createTeam(dto: { name: string; departmentId: number }) {
    return this.http.post(`${environment.apiUrl}/organisation/teams`, dto);
  }
}
