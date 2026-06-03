import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { PayslipsService } from '../../core/services/payslips.service';

@Component({
  selector: 'app-payslips-page',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe],
  templateUrl: './payslips-page.component.html',
  styleUrl: './payslips-page.component.scss',
})
export class PayslipsPageComponent implements OnInit {
  rows: any[] = [];
  downloadingId: number | null = null;
  downloadError = '';

  constructor(private readonly payslipsService: PayslipsService) {}

  ngOnInit(): void {
    this.payslipsService.list().subscribe((res: any) => (this.rows = res));
  }

  download(id: number): void {
    this.downloadingId = id;
    this.downloadError = '';
    this.payslipsService.downloadPdf(id).subscribe({
      next: (res) => {
        const blob = res.body!;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${id}.html`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingId = null;
      },
      error: (err) => {
        this.downloadError = err?.error?.message || 'Download failed. Please try again.';
        this.downloadingId = null;
      },
    });
  }
}
