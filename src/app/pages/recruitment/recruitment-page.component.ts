import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PipelineStage,
  RecruitmentService,
} from '../../core/services/recruitment.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';

@Component({
  selector: 'app-recruitment-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule, ConfirmDialogComponent, EditDialogShellComponent],
  templateUrl: './recruitment-page.component.html',
  styleUrl: './recruitment-page.component.scss',
})
export class RecruitmentPageComponent implements OnInit {
  jobs: any[] = [];
  candidates: any[] = [];

  canManage = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  activeTab: 'jobs' | 'candidates' | 'pipeline' = 'jobs';
  mutatingId: number | null = null;
  companyCode = '';

  showJobForm = false;
  jobForm = { title: '', department: '', description: '', status: 'DRAFT' as 'DRAFT' | 'OPEN' | 'CLOSED' };

  showCandidateForm = false;
  candidateForm = {
    name: '',
    email: '',
    phone: '',
    jobPostId: 0,
    roleApplied: '',
    source: 'Direct',
    stage: 'APPLIED' as PipelineStage,
    notes: '',
  };

  editingJob: any | null = null;
  jobEditForm = { title: '', department: '', description: '', status: 'DRAFT' as 'DRAFT' | 'OPEN' | 'CLOSED' };
  editBusy = false;

  candidateFilterJobId = 0;
  resumeUploadCandidateId: number | null = null;
  resumeUploadBusy = false;

  deleteTarget: { type: 'job' | 'candidate'; item: any } | null = null;
  confirmBusy = false;

  readonly pipelineStages: PipelineStage[] = [
    'APPLIED',
    'SCREENING',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED',
  ];

  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.canManage = this.auth.hasAnyPermission(['recruitment.manage']);
    this.companyCode = this.auth.user()?.tenantCode ?? '';
    this.loadAll();
  }

  careersBaseLink(): string {
    return `${window.location.origin}/careers/${this.companyCode}`;
  }

  copyCareersLink(): void {
    this.copyToClipboard(this.careersBaseLink(), 'Public careers link copied.');
  }

  copyJobLink(job: any): void {
    const link = `${this.careersBaseLink()}?job=${job.id}`;
    this.copyToClipboard(link, `Apply link for "${job.title}" copied.`);
  }

  private copyToClipboard(text: string, successMsg: string): void {
    if (!this.companyCode) {
      this.showMsg('Company code not found for this account.', 'error');
      return;
    }

    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        this.showMsg(successMsg, 'success');
      } catch {
        this.showMsg(`Copy failed. Link: ${text}`, 'error');
      }
      document.body.removeChild(area);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.showMsg(successMsg, 'success'),
        () => fallback(),
      );
    } else {
      fallback();
    }
  }

  loadAll(): void {
    this.recruitmentService.listJobs().subscribe((res: any) => (this.jobs = res));
    this.recruitmentService.listCandidates(this.candidateFilterJobId || undefined).subscribe((res: any) => {
      this.candidates = res;
    });
  }

  reloadCandidates(): void {
    this.recruitmentService
      .listCandidates(this.candidateFilterJobId || undefined)
      .subscribe((res: any) => (this.candidates = res));
  }

  isBusy(id: number): boolean {
    return this.mutatingId === id;
  }

  candidatesInStage(stage: PipelineStage): any[] {
    return this.candidates.filter((c) => c.stage === stage);
  }

  onJobFormSelect(): void {
    const job = this.jobs.find((j) => j.id === this.candidateForm.jobPostId);
    if (job && !this.candidateForm.roleApplied.trim()) {
      this.candidateForm.roleApplied = job.title;
    }
  }

  createJob(): void {
    if (!this.jobForm.title.trim()) {
      this.showMsg('Job title is required.', 'error');
      return;
    }
    this.recruitmentService
      .createJob({
        title: this.jobForm.title.trim(),
        department: this.jobForm.department.trim() || undefined,
        description: this.jobForm.description.trim() || undefined,
        status: this.jobForm.status,
      })
      .subscribe({
        next: () => {
          this.showMsg('Job post created.', 'success');
          this.jobForm = { title: '', department: '', description: '', status: 'DRAFT' };
          this.showJobForm = false;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to create job.', 'error'),
      });
  }

  openEditJob(job: any): void {
    this.editingJob = job;
    this.jobEditForm = {
      title: job.title ?? '',
      department: job.department ?? '',
      description: job.description ?? '',
      status: job.status ?? 'DRAFT',
    };
  }

  closeJobEdit(): void {
    if (!this.editBusy) this.editingJob = null;
  }

  submitJobEdit(): void {
    if (!this.editingJob || !this.jobEditForm.title.trim()) return;
    this.mutatingId = this.editingJob.id;
    this.editBusy = true;
    this.recruitmentService
      .updateJob(this.editingJob.id, {
        title: this.jobEditForm.title.trim(),
        department: this.jobEditForm.department.trim() || undefined,
        description: this.jobEditForm.description.trim() || undefined,
        status: this.jobEditForm.status,
      })
      .subscribe({
        next: () => {
          this.showMsg('Job post updated.', 'success');
          this.editingJob = null;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to update job.', 'error'),
        complete: () => {
          this.mutatingId = null;
          this.editBusy = false;
        },
      });
  }

  createCandidate(): void {
    if (!this.candidateForm.name.trim() || !this.candidateForm.email.trim() || !this.candidateForm.roleApplied.trim()) {
      this.showMsg('Name, email, and role are required.', 'error');
      return;
    }
    this.recruitmentService
      .createCandidate({
        name: this.candidateForm.name.trim(),
        email: this.candidateForm.email.trim(),
        phone: this.candidateForm.phone.trim() || undefined,
        jobPostId: this.candidateForm.jobPostId || undefined,
        roleApplied: this.candidateForm.roleApplied.trim(),
        source: this.candidateForm.source.trim() || 'Direct',
        stage: this.candidateForm.stage,
        notes: this.candidateForm.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.showMsg('Candidate added.', 'success');
          this.candidateForm = {
            name: '',
            email: '',
            phone: '',
            jobPostId: 0,
            roleApplied: '',
            source: 'Direct',
            stage: 'APPLIED',
            notes: '',
          };
          this.showCandidateForm = false;
          this.loadAll();
        },
        error: (err) => this.showMsg(err?.error?.message || 'Failed to add candidate.', 'error'),
      });
  }

  moveCandidateStage(candidate: any, stage: PipelineStage): void {
    if (candidate.stage === stage) return;
    this.mutatingId = candidate.id;
    this.recruitmentService.updateCandidate(candidate.id, { stage }).subscribe({
      next: () => {
        this.showMsg(`${candidate.name} moved to ${stage}.`, 'success');
        this.reloadCandidates();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Failed to update stage.', 'error'),
      complete: () => {
        this.mutatingId = null;
      },
    });
  }

  onResumeSelected(event: Event, candidateId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resumeUploadCandidateId = candidateId;
    this.resumeUploadBusy = true;
    this.recruitmentService.uploadResume(candidateId, file).subscribe({
      next: (res: any) => {
        this.showMsg(res?.message || 'Resume uploaded.', 'success');
        this.reloadCandidates();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Resume upload failed.', 'error'),
      complete: () => {
        this.resumeUploadBusy = false;
        this.resumeUploadCandidateId = null;
        input.value = '';
      },
    });
  }

  resumeLink(candidate: any): string | null {
    if (!candidate?.resumeUrl) return null;
    return `${this.recruitmentService.fileBase}${candidate.resumeUrl}`;
  }

  promptDelete(type: 'job' | 'candidate', item: any): void {
    this.deleteTarget = { type, item };
  }

  closeDeleteDialog(): void {
    if (!this.confirmBusy) this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const { type, item } = this.deleteTarget;
    this.confirmBusy = true;
    this.mutatingId = item.id;

    const request =
      type === 'job'
        ? this.recruitmentService.deleteJob(item.id)
        : this.recruitmentService.deleteCandidate(item.id);

    request.subscribe({
      next: () => {
        this.showMsg(`${type === 'job' ? 'Job post' : 'Candidate'} deleted.`, 'success');
        this.deleteTarget = null;
        this.loadAll();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Delete failed.', 'error'),
      complete: () => {
        this.mutatingId = null;
        this.confirmBusy = false;
      },
    });
  }

  stageLabel(stage: string): string {
    return stage.replace(/_/g, ' ');
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
  }
}
