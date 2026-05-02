import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, NgFor } from '@angular/common';
import { PayslipsService } from '../../core/services/payslips.service';

@Component({
  selector: 'app-payslips-page',
  standalone: true,
  imports: [NgFor, CurrencyPipe],
  templateUrl: './payslips-page.component.html',
  styleUrl: './payslips-page.component.scss',
})
export class PayslipsPageComponent implements OnInit {
  rows: any[] = [];

  constructor(private readonly payslipsService: PayslipsService) {}

  ngOnInit(): void {
    this.payslipsService.list().subscribe((res: any) => (this.rows = res));
  }
}
