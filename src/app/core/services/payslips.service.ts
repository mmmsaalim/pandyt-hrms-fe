import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PayslipsService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/payslips`);
  }

  downloadPdf(id: number) {
    return this.http.get(`${environment.apiUrl}/payslips/${id}/pdf`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
