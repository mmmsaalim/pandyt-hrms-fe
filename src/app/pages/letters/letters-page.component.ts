import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrLetter, LettersService } from '../../core/services/letters.service';
import { EmployeesService } from '../../core/services/employees.service';
import { AuthService } from '../../core/services/auth.service';
import { buildLetterPrintHtml } from './letter-print.util';
import { LETTER_TYPES, letterTypeLabel, LetterTypeValue } from './letter-templates';

@Component({
  selector: 'app-letters-page',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, DatePipe],
  templateUrl: './letters-page.component.html',
  styleUrl: './letters-page.component.scss',
})
export class LettersPageComponent implements OnInit {
  letters: HrLetter[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  showComposer = false;
  editingId: number | null = null;
  private skipNextTypeChange = false;

  form = {
    title: '',
    letterType: 'GENERAL' as LetterTypeValue,
    recipientName: '',
    body: '',
  };

  // Send-by-email dialog state.
  employees: Array<{ id: number; name: string; email: string }> = [];
  sendTarget: HrLetter | null = null;
  sendMode: 'employee' | 'email' = 'employee';
  sending = false;
  sendForm = { employeeId: 0, email: '', recipientName: '' };

  readonly letterTypes = LETTER_TYPES;

  constructor(
    private readonly lettersService: LettersService,
    private readonly employeesService: EmployeesService,
    private readonly auth: AuthService,
  ) {}

  get isCompanyAdmin(): boolean {
    return (this.auth.user()?.roles ?? []).includes('COMPANY_ADMIN');
  }

  typeLabel(value: string): string {
    return letterTypeLabel(value);
  }

  creatorLabel(letter: HrLetter): string {
    const creator = letter.createdByUser;
    if (!creator) {
      return '—';
    }
    const name = `${creator.firstName} ${creator.lastName}`.trim();
    return name || creator.email;
  }

  ngOnInit(): void {
    this.load();
    this.loadEmployees();
  }

  private loadEmployees(): void {
    this.employeesService.list().subscribe({
      next: (rows: any) => {
        this.employees = (Array.isArray(rows) ? rows : [])
          .map((row: any) => ({
            id: Number(row.id),
            name: `${row?.user?.firstName ?? ''} ${row?.user?.lastName ?? ''}`.trim() || `Employee #${row.id}`,
            email: row?.user?.email ?? '',
          }))
          .filter((e: { email: string }) => !!e.email && !e.email.endsWith('@no-email.flowhr.local'));
      },
      error: () => {
        this.employees = [];
      },
    });
  }

  openSendDialog(letter: HrLetter): void {
    this.sendTarget = letter;
    this.sendMode = this.employees.length ? 'employee' : 'email';
    this.sendForm = { employeeId: 0, email: '', recipientName: letter.recipientName ?? '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeSendDialog(): void {
    if (this.sending) {
      return;
    }
    this.sendTarget = null;
  }

  confirmSend(): void {
    if (!this.sendTarget) {
      return;
    }

    const payload =
      this.sendMode === 'employee'
        ? { employeeId: this.sendForm.employeeId }
        : { email: this.sendForm.email.trim(), recipientName: this.sendForm.recipientName.trim() || undefined };

    if (this.sendMode === 'employee' && !this.sendForm.employeeId) {
      this.errorMessage = 'Select an employee to send the letter to.';
      return;
    }
    if (this.sendMode === 'email' && !this.sendForm.email.trim()) {
      this.errorMessage = 'Enter an email address to send the letter to.';
      return;
    }

    this.sending = true;
    this.errorMessage = '';
    this.lettersService.sendByEmail(this.sendTarget.id, payload).subscribe({
      next: (res) => {
        this.successMessage = `Letter sent to ${res.sentTo}.`;
        this.sending = false;
        this.sendTarget = null;
        this.load();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to send the letter.';
        this.sending = false;
      },
    });
  }

  load(): void {
    this.loading = true;
    this.lettersService.list().subscribe({
      next: (rows) => {
        this.letters = rows;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load letters.';
        this.loading = false;
      },
    });
  }

  openComposer(letter?: HrLetter): void {
    this.showComposer = true;
    this.editingId = letter?.id ?? null;
    this.skipNextTypeChange = true;
    this.form = {
      title: letter?.title ?? '',
      letterType: (letter?.letterType as LetterTypeValue) ?? 'GENERAL',
      recipientName: letter?.recipientName ?? '',
      body: letter?.body ?? '',
    };

    if (!letter) {
      this.applyTemplate(false);
    }
  }

  closeComposer(): void {
    this.showComposer = false;
    this.editingId = null;
    this.form = { title: '', letterType: 'GENERAL', recipientName: '', body: '' };
  }

  onLetterTypeChange(type: LetterTypeValue): void {
    if (this.skipNextTypeChange) {
      this.skipNextTypeChange = false;
      return;
    }
    this.applyTemplate(true);
  }

  applyTemplate(confirmWhenFilled = true): void {
    const template = this.letterTypes.find((item) => item.value === this.form.letterType);
    if (!template) {
      return;
    }

    const hasBody = this.form.body.trim().length > 0;
    if (hasBody && confirmWhenFilled) {
      const replace = confirm(`Load the official ${template.label.toLowerCase()} template? This will replace the current body.`);
      if (!replace) {
        return;
      }
    }

    if (!this.form.title.trim() || confirmWhenFilled) {
      this.form.title = template.defaultTitle;
    }
    this.form.body = template.body;
  }

  save(): void {
    if (!this.form.title.trim() || !this.form.body.trim()) {
      this.errorMessage = 'Title and body are required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      title: this.form.title.trim(),
      letterType: this.form.letterType,
      recipientName: this.form.recipientName.trim() || undefined,
      body: this.form.body.trim(),
    };

    const request = this.editingId
      ? this.lettersService.update(this.editingId, payload)
      : this.lettersService.create(payload);

    request.subscribe({
      next: () => {
        this.successMessage = this.editingId ? 'Letter updated.' : 'Letter created.';
        this.closeComposer();
        this.load();
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save letter.';
        this.saving = false;
      },
    });
  }

  print(id: number): void {
    this.errorMessage = '';
    this.lettersService.getPrintPayload(id).subscribe({
      next: (payload) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const frameWindow = iframe.contentWindow;
        const doc = frameWindow?.document;
        if (!frameWindow || !doc) {
          document.body.removeChild(iframe);
          this.errorMessage = 'Unable to open print preview.';
          return;
        }

        doc.open();
        doc.write(buildLetterPrintHtml(payload));
        doc.close();

        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to prepare letter for printing.';
      },
    });
  }

  remove(id: number): void {
    if (!confirm('Delete this letter?')) return;
    this.lettersService.remove(id).subscribe({
      next: () => {
        this.successMessage = 'Letter deleted.';
        this.load();
      },
      error: () => {
        this.errorMessage = 'Failed to delete letter.';
      },
    });
  }
}
