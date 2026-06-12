import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecruitmentService } from '../core/services/recruitment.service';

@Component({
  selector: 'app-careers-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  templateUrl: './careers-page.component.html',
  styleUrl: './careers-page.component.scss',
})
export class CareersPageComponent implements OnInit {
  companyCode = '';
  company: any | null = null;
  jobs: any[] = [];
  loading = false;
  applyingJobId: number | null = null;
  selectedJob: any | null = null;
  selectedResume: File | null = null;
  errorMessage = '';
  successMessage = '';

  form = {
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly recruitmentService: RecruitmentService,
  ) {}

  ngOnInit(): void {
    this.companyCode = this.route.snapshot.paramMap.get('companyCode') ?? '';
    const preselectJobId = Number(this.route.snapshot.queryParamMap.get('job'));
    this.loadJobs(Number.isFinite(preselectJobId) && preselectJobId > 0 ? preselectJobId : undefined);
  }

  loadJobs(preselectJobId?: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.recruitmentService.publicOpenJobs(this.companyCode).subscribe({
      next: (res: any) => {
        this.company = res?.company ?? null;
        this.jobs = res?.jobs ?? [];

        if (preselectJobId) {
          const job = this.jobs.find((j) => j.id === preselectJobId);
          if (job) {
            this.openApply(job);
          }
        }
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load open jobs.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  openApply(job: any): void {
    this.selectedJob = job;
    this.selectedResume = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = {
      name: '',
      email: '',
      phone: '',
      coverLetter: '',
    };
  }

  closeApply(): void {
    if (this.applyingJobId !== null) return;
    this.selectedJob = null;
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedResume = input.files?.[0] ?? null;
  }

  submitApplication(): void {
    if (!this.selectedJob) return;

    if (!this.form.name.trim() || !this.form.email.trim() || !this.selectedResume) {
      this.errorMessage = 'Name, email, and CV are required.';
      return;
    }

    this.applyingJobId = this.selectedJob.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.recruitmentService
      .publicApply(
        this.companyCode,
        this.selectedJob.id,
        {
          name: this.form.name.trim(),
          email: this.form.email.trim(),
          phone: this.form.phone.trim() || undefined,
          coverLetter: this.form.coverLetter.trim() || undefined,
        },
        this.selectedResume,
      )
      .subscribe({
        next: (res: any) => {
          this.successMessage =
            res?.message || 'Application submitted successfully. HR will review your CV.';
          this.selectedJob = null;
          this.selectedResume = null;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Application submission failed.';
        },
        complete: () => {
          this.applyingJobId = null;
        },
      });
  }
}
