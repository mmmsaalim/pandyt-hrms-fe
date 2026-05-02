import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor } from '@angular/common';
import { AttendanceService } from '../../core/services/attendance.service';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [NgFor, DatePipe],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent implements OnInit {
  rows: any[] = [];

  constructor(private readonly attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.attendanceService.list().subscribe((res: any) => (this.rows = res));
  }
}
