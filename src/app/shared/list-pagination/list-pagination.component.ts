import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationMeta } from '../../core/models/pagination.model';

@Component({
  selector: 'app-list-pagination',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './list-pagination.component.html',
  styleUrl: './list-pagination.component.scss',
})
export class ListPaginationComponent {
  @Input({ required: true }) pagination!: PaginationMeta;
  @Input() pageSizeOptions = [5, 10, 25, 50];
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  get startItem(): number {
    if (!this.pagination.total) {
      return 0;
    }

    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  get endItem(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
  }

  previous(): void {
    if (this.pagination.page <= 1 || this.disabled) {
      return;
    }

    this.pageChange.emit(this.pagination.page - 1);
  }

  next(): void {
    if (this.pagination.page >= this.pagination.totalPages || this.disabled) {
      return;
    }

    this.pageChange.emit(this.pagination.page + 1);
  }

  onLimitChange(limit: number | string): void {
    if (this.disabled) {
      return;
    }

    this.limitChange.emit(Number(limit));
  }
}

