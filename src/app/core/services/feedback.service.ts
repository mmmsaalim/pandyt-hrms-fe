import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface HrFeedback {
  id: number;
  subjectLabel?: string | null;
  category: string;
  rating?: number | null;
  body: string;
  contextModule?: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<HrFeedback[]>(`${environment.apiUrl}/feedback`);
  }

  create(dto: {
    subjectLabel?: string;
    category?: string;
    rating?: number;
    body: string;
    contextModule?: string;
  }) {
    return this.http.post<HrFeedback>(`${environment.apiUrl}/feedback`, dto);
  }
}
