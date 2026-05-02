import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly http: HttpClient) {}

  summary() {
    return this.http.get(`${environment.apiUrl}/reports/summary`);
  }
}
