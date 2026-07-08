import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService, HrFeedback } from '../../core/services/feedback.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';

type EmployeeOption = {
  id: number;
  label: string;
};

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, DatePipe],
  templateUrl: './feedback-page.component.html',
  styleUrl: './feedback-page.component.scss',
})
export class FeedbackPageComponent implements OnInit {
  rows: HrFeedback[] = [];
  employeeOptions: EmployeeOption[] = [];
  canSubmit = false;
  loading = false;
  saving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  form = {
    subjectEmployeeId: 0,
    category: 'GENERAL',
    rating: 4,
    body: '',
    contextModule: 'employees',
  };

  readonly starOptions = [1, 2, 3, 4, 5];

  readonly categories = [
    { value: 'GENERAL', label: 'General' },
    { value: 'PERFORMANCE', label: 'Performance' },
    { value: 'ATTENDANCE', label: 'Attendance' },
    { value: 'LEAVE', label: 'Leave' },
    { value: 'CONDUCT', label: 'Conduct' },
  ];

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly employeesService: EmployeesService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.canSubmit =
      roles.includes('COMPANY_ADMIN') ||
      roles.includes('HR_MANAGER') ||
      roles.includes('TEAM_LEAD');
    this.loadEmployees();
    this.load();
  }

  loadEmployees(): void {
    this.employeesService.list().subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.employeeOptions = list
          .map((row) => ({
            id: Number(row.id),
            label:
              `${row?.user?.firstName ?? ''} ${row?.user?.lastName ?? ''}`.trim() ||
              row?.employeeCode ||
              `Employee #${row.id}`,
          }))
          .filter((row) => Number.isFinite(row.id) && row.id > 0)
          .sort((a, b) => a.label.localeCompare(b.label));
      },
      error: () => {
        this.employeeOptions = [];
      },
    });
  }

  load(): void {
    this.loading = true;
    this.feedbackService.list().subscribe({
      next: (rows) => {
        this.rows = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  setRating(value: number): void {
    this.form.rating = value;
  }

  submit(): void {
    if (!this.form.body.trim()) {
      this.showMsg('Feedback text is required.', 'error');
      return;
    }

    const selectedEmployee = this.employeeOptions.find((row) => row.id === this.form.subjectEmployeeId);
    const subjectLabel = selectedEmployee?.label;

    this.saving = true;
    this.feedbackService
      .create({
        subjectLabel: subjectLabel || undefined,
        category: this.form.category,
        rating: this.form.rating,
        body: this.form.body.trim(),
        contextModule: this.form.contextModule,
      })
      .subscribe({
        next: () => {
          this.form = {
            subjectEmployeeId: 0,
            category: 'GENERAL',
            rating: 4,
            body: '',
            contextModule: 'employees',
          };
          this.showMsg('Feedback saved for future AI scoring and HR review.', 'success');
          this.load();
          this.saving = false;
        },
        error: (err) => {
          this.showMsg(err?.error?.message || 'Failed to save feedback.', 'error');
          this.saving = false;
        },
      });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
  }
}
