import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ConfigPermission {
  id: number;
  permission: string;
  module: string;
  description?: string;
}

export interface ConfigRole {
  id: number;
  name: string;
  tenantId: number | null;
  description?: string;
  rolePermissions: Array<{
    permissionId: number;
    permission: ConfigPermission;
  }>;
}

export interface ConfigUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    role: {
      id: number;
      name: string;
      tenantId: number | null;
    };
  }>;
}

export interface RoleConfigurationResponse {
  managedTenantId: number | null;
  permissions: ConfigPermission[];
  roles: ConfigRole[];
  users: ConfigUser[];
}

@Injectable({ providedIn: 'root' })
export class RoleConfigurationService {
  constructor(private readonly http: HttpClient) {}

  getConfiguration() {
    return this.http.get<RoleConfigurationResponse>(`${environment.apiUrl}/roles/configuration`);
  }

  createTenantRole(dto: { role: string; description?: string }) {
    return this.http.post(`${environment.apiUrl}/roles/tenant`, dto);
  }

  bootstrapTenantModuleRoles() {
    return this.http.post(`${environment.apiUrl}/roles/tenant/bootstrap-modules`, {});
  }

  setRolePermissions(roleId: number, permissionIds: number[]) {
    return this.http.put(`${environment.apiUrl}/roles/${roleId}/permissions`, { permissionIds });
  }

  assignScopedRole(dto: { userId: number; roleId: number }) {
    return this.http.post(`${environment.apiUrl}/roles/assign/scoped`, dto);
  }

  unassignScopedRole(dto: { userId: number; roleId: number }) {
    return this.http.post(`${environment.apiUrl}/roles/unassign/scoped`, dto);
  }
}
