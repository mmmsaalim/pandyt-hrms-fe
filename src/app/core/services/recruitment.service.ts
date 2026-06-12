import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type JobPostStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type PipelineStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

@Injectable({ providedIn: 'root' })
export class RecruitmentService {
  private readonly base = `${environment.apiUrl}/recruitment`;
  readonly fileBase = environment.apiUrl.replace(/\/api$/, '');

  constructor(private readonly http: HttpClient) {}

  listJobs() {
    return this.http.get(`${this.base}/jobs`);
  }

  createJob(dto: {
    title: string;
    department?: string;
    description?: string;
    requiredSkills?: string[];
    status?: JobPostStatus;
  }) {
    return this.http.post(`${this.base}/jobs`, dto);
  }

  updateJob(
    id: number,
    dto: {
      title?: string;
      department?: string;
      description?: string;
      requiredSkills?: string[];
      status?: JobPostStatus;
    },
  ) {
    return this.http.patch(`${this.base}/jobs/${id}`, dto);
  }

  deleteJob(id: number) {
    return this.http.delete(`${this.base}/jobs/${id}`);
  }

  listCandidates(jobPostId?: number) {
    const query = jobPostId ? `?jobPostId=${jobPostId}` : '';
    return this.http.get(`${this.base}/candidates${query}`);
  }

  createCandidate(dto: {
    name: string;
    email: string;
    phone?: string;
    jobPostId?: number;
    roleApplied: string;
    source: string;
    stage?: PipelineStage;
    rating?: number;
    notes?: string;
  }) {
    return this.http.post(`${this.base}/candidates`, dto);
  }

  updateCandidate(
    id: number,
    dto: {
      name?: string;
      phone?: string;
      jobPostId?: number;
      roleApplied?: string;
      source?: string;
      stage?: PipelineStage;
      rating?: number;
      notes?: string;
    },
  ) {
    return this.http.patch(`${this.base}/candidates/${id}`, dto);
  }

  deleteCandidate(id: number) {
    return this.http.delete(`${this.base}/candidates/${id}`);
  }

  uploadResume(candidateId: number, file: File) {
    const form = new FormData();
    form.append('resume', file);
    return this.http.post(`${this.base}/candidates/${candidateId}/resume`, form);
  }

  pipelineSummary() {
    return this.http.get(`${this.base}/pipeline/summary`);
  }

  publicOpenJobs(companyCode: string) {
    return this.http.get(`${environment.apiUrl}/public/careers/${companyCode}/jobs`);
  }

  publicApply(
    companyCode: string,
    jobId: number,
    dto: { name: string; email: string; phone?: string; coverLetter?: string },
    resume: File,
  ) {
    const form = new FormData();
    form.append('name', dto.name);
    form.append('email', dto.email);
    if (dto.phone) form.append('phone', dto.phone);
    if (dto.coverLetter) form.append('coverLetter', dto.coverLetter);
    form.append('resume', resume);
    return this.http.post(`${environment.apiUrl}/public/careers/${companyCode}/jobs/${jobId}/apply`, form);
  }

  // Legacy alias
  list() {
    return this.listCandidates();
  }
}
