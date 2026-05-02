import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { TenantsService } from '../../core/services/tenants.service';

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [NgFor],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
})
export class TenantsPageComponent implements OnInit {
  rows: any[] = [];

  constructor(private readonly tenantsService: TenantsService) {}

  ngOnInit(): void {
    this.tenantsService.list().subscribe((res: any) => (this.rows = res));
  }
}
