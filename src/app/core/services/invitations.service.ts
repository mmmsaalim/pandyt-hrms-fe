import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  constructor(private readonly http: HttpClient) {}

  resolve(token: string) {
    return this.http.get(`${environment.apiUrl}/invitations/resolve?token=${encodeURIComponent(token)}`);
  }

  accept(token: string, password: string) {
    return this.http.post(`${environment.apiUrl}/invitations/accept`, { token, password });
  }

  list() {
    return this.http.get<any[]>(`${environment.apiUrl}/invitations`);
  }

  resend(email: string) {
    return this.http.post<{ message: string; expiresAt: string }>(
      `${environment.apiUrl}/invitations/resend`,
      { email },
    );
  }
}