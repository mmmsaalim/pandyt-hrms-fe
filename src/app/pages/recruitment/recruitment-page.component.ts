import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { RecruitmentService } from '../../core/services/recruitment.service';

@Component({
  selector: 'app-recruitment-page',
  standalone: true,
  imports: [NgFor],
  templateUrl: './recruitment-page.component.html',
  styleUrl: './recruitment-page.component.scss',
})
export class RecruitmentPageComponent implements OnInit {
  rows: any[] = [];

  constructor(private readonly recruitmentService: RecruitmentService) {}

  ngOnInit(): void {
    this.recruitmentService.list().subscribe((res: any) => (this.rows = res));
  }
}
