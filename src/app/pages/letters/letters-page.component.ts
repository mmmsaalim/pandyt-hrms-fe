import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrLetter, LettersService } from '../../core/services/letters.service';
import { AuthService } from '../../core/services/auth.service';

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

  form = {
    title: '',
    letterType: 'GENERAL',
    recipientName: '',
    body: '',
  };

  readonly letterTypes = [
    { value: 'GENERAL', label: 'General letter' },
    { value: 'APPOINTMENT', label: 'Appointment letter' },
    { value: 'WARNING', label: 'Warning letter' },
    { value: 'CONFIRMATION', label: 'Confirmation letter' },
    { value: 'OFFER', label: 'Offer letter' },
    { value: 'EXPERIENCE', label: 'Experience certificate' },
  ];

  constructor(
    private readonly lettersService: LettersService,
    private readonly auth: AuthService,
  ) {}

  get isCompanyAdmin(): boolean {
    return (this.auth.user()?.roles ?? []).includes('COMPANY_ADMIN');
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
    this.form = {
      title: letter?.title ?? '',
      letterType: letter?.letterType ?? 'GENERAL',
      recipientName: letter?.recipientName ?? '',
      body: letter?.body ?? '',
    };
  }

  closeComposer(): void {
    this.showComposer = false;
    this.editingId = null;
    this.form = { title: '', letterType: 'GENERAL', recipientName: '', body: '' };
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

        const { letter, letterhead } = payload;
        const safeBody = letter.body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html><head><title>${letter.title}</title>
          <style>
            body { font-family: Georgia, serif; margin: 40px; color: #222; }
            .letterhead { border-bottom: 2px solid #f47421; padding-bottom: 16px; margin-bottom: 24px; }
            .letterhead img { max-height: 56px; margin-bottom: 8px; }
            .letterhead h1 { margin: 0; font-size: 22px; }
            .meta { color: #666; font-size: 13px; margin-top: 6px; }
            .body { white-space: pre-wrap; line-height: 1.6; font-size: 15px; }
            .recipient { margin-bottom: 18px; font-weight: 600; }
          </style></head><body>
          <div class="letterhead">
            ${letterhead.logoUrl ? `<img src="${letterhead.logoUrl}" alt="Logo" />` : ''}
            <h1>${letterhead.companyDisplayName}</h1>
            <div class="meta">${letterhead.address}${letterhead.phone ? ' · ' + letterhead.phone : ''}${letterhead.email ? ' · ' + letterhead.email : ''}</div>
          </div>
          ${letter.recipientName ? `<div class="recipient">To: ${letter.recipientName}</div>` : ''}
          <h2>${letter.title}</h2>
          <div class="body">${safeBody}</div>
          </body></html>
        `);
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
