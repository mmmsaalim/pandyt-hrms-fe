import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CrossTenantReportsService {
  private apiUrl = 'http://localhost:3000/api/cross-tenant-reports'; // Adjust this to your backend URL

  constructor(private http: HttpClient) {}

  getLeaveSummary(tenantIds?: number[]): Observable<any[]> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get<any[]>(`${this.apiUrl}/leave-summary`, { params });
  }

  getAttendanceSummary(tenantIds?: number[]): Observable<any[]> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get<any[]>(`${this.apiUrl}/attendance-summary`, { params });
  }

  getPayrollSummary(tenantIds?: number[]): Observable<any[]> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get<any[]>(`${this.apiUrl}/payroll-summary`, { params });
  }

  exportLeaveSummaryCsv(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/leave-summary/export-csv`, { params, responseType: 'blob' });
  }

  exportAttendanceSummaryCsv(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/attendance-summary/export-csv`, { params, responseType: 'blob' });
  }

  exportPayrollSummaryCsv(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/payroll-summary/export-csv`, { params, responseType: 'blob' });
  }

  exportLeaveSummaryPdf(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/leave-summary/export-pdf`, { params, responseType: 'blob' });
  }

  exportAttendanceSummaryPdf(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/attendance-summary/export-pdf`, { params, responseType: 'blob' });
  }

  exportPayrollSummaryPdf(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/payroll-summary/export-pdf`, { params, responseType: 'blob' });
  }

  exportLeaveSummaryExcel(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/leave-summary/export-excel`, { params, responseType: 'blob' });
  }

  exportAttendanceSummaryExcel(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/attendance-summary/export-excel`, { params, responseType: 'blob' });
  }

  exportPayrollSummaryExcel(tenantIds?: number[]): Observable<Blob> {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.append('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${this.apiUrl}/payroll-summary/export-excel`, { params, responseType: 'blob' });
  }
}
