import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { EmployeesService } from '../../core/services/employees.service';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [NgFor],
  templateUrl: './employees-page.component.html',
  styleUrl: './employees-page.component.scss',
})
export class EmployeesPageComponent implements OnInit {
  employees: any[] = [];

  constructor(private readonly employeesService: EmployeesService) {}

  ngOnInit(): void {
    this.employeesService.list().subscribe((rows: any) => (this.employees = rows));
  }
}
