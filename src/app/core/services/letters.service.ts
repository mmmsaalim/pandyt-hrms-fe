import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HrLetter {
  id: number;
  title: string;
  letterType: string;
  recipientName?: string | null;
  body: string;
  status: string;
  createdBy?: number;
  createdByUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LetterPrintPayload {
  letter: HrLetter;
  letterhead: {
    companyDisplayName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
  };
  locale: string;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class LettersService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<HrLetter[]> {
    return this.http.get<HrLetter[]>(`${environment.apiUrl}/letters`);
  }

  get(id: number): Observable<HrLetter> {
    return this.http.get<HrLetter>(`${environment.apiUrl}/letters/${id}`);
  }

  create(dto: { title: string; letterType?: string; recipientName?: string; body: string }) {
    return this.http.post<HrLetter>(`${environment.apiUrl}/letters`, dto);
  }

  update(id: number, dto: Partial<{ title: string; letterType: string; recipientName: string; body: string; status: string }>) {
    return this.http.patch<HrLetter>(`${environment.apiUrl}/letters/${id}`, dto);
  }

  remove(id: number) {
    return this.http.delete(`${environment.apiUrl}/letters/${id}`);
  }

  getPrintPayload(id: number): Observable<LetterPrintPayload> {
    return this.http.get<LetterPrintPayload>(`${environment.apiUrl}/letters/${id}/print`);
  }
}
