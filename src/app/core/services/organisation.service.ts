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

  updateLocation(id: number, dto: { name?: string; address?: string }) {
    return this.http.patch(`${environment.apiUrl}/organisation/locations/${id}`, dto);
  }

  deleteLocation(id: number) {
    return this.http.delete(`${environment.apiUrl}/organisation/locations/${id}`);
  }

  getDepartments() {
    return this.http.get(`${environment.apiUrl}/organisation/departments`);
  }

  createDepartment(dto: { name: string; locationId?: number }) {
    return this.http.post(`${environment.apiUrl}/organisation/departments`, dto);
  }

  updateDepartment(id: number, dto: { name?: string; locationId?: number | null }) {
    return this.http.patch(`${environment.apiUrl}/organisation/departments/${id}`, dto);
  }

  deleteDepartment(id: number) {
    return this.http.delete(`${environment.apiUrl}/organisation/departments/${id}`);
  }

  getTeams() {
    return this.http.get(`${environment.apiUrl}/organisation/teams`);
  }

  createTeam(dto: { name: string; departmentId: number }) {
    return this.http.post(`${environment.apiUrl}/organisation/teams`, dto);
  }

  updateTeam(id: number, dto: { name?: string; departmentId?: number }) {
    return this.http.patch(`${environment.apiUrl}/organisation/teams/${id}`, dto);
  }

  deleteTeam(id: number) {
    return this.http.delete(`${environment.apiUrl}/organisation/teams/${id}`);
  }
}
