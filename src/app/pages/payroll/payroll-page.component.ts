import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, NgFor } from '@angular/common';
import { PayrollService } from '../../core/services/payroll.service';

@Component({
  selector: 'app-payroll-page',
  standalone: true,
  imports: [NgFor, CurrencyPipe],
  templateUrl: './payroll-page.component.html',
  styleUrl: './payroll-page.component.scss',
})
export class PayrollPageComponent implements OnInit {
  rows: any[] = [];

  constructor(private readonly payrollService: PayrollService) {}

  ngOnInit(): void {
    this.payrollService.list().subscribe((res: any) => (this.rows = res));
  }
}
