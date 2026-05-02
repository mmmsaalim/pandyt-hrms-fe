import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [NgFor],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent implements OnInit {
  cards = [
    { label: 'Employees', value: 0 },
    { label: 'Leaves', value: 0 },
    { label: 'Payroll Runs', value: 0 },
  ];

  constructor(private readonly reportsService: ReportsService) {}

  ngOnInit(): void {
    this.reportsService.summary().subscribe((res: any) => {
      this.cards = [
        { label: 'Employees', value: res.employees ?? 0 },
        { label: 'Leaves', value: res.leaves ?? 0 },
        { label: 'Payroll Runs', value: res.payrollRuns ?? 0 },
      ];
    });
  }
}
