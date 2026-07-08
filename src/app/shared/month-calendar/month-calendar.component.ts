import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import {
  compareLocalIsoDates,
  normalizeLocalDateRange,
  parseLocalIsoDate,
  toLocalIsoDate,
} from '../../core/utils/local-date';

export interface CalendarDayMarker {
  date: string;
  label?: string;
  tone?: 'leave' | 'attendance' | 'pending' | 'approved' | 'rejected' | 'default';
}

export interface CalendarRangeSelection {
  start: string;
  end: string;
}

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, SlicePipe],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
})
export class MonthCalendarComponent implements OnChanges {
  @Input() markers: CalendarDayMarker[] = [];
  @Input() selectedDate = '';
  /** Earliest date the user may pick (ISO yyyy-MM-dd). Leave empty to allow all dates. */
  @Input() minSelectableDate = '';
  /** Enable click start + click end range selection (HR leave apply pattern). */
  @Input() enableRangeSelection = false;
  @Input() rangeStart = '';
  @Input() rangeEnd = '';
  @Output() selectedDateChange = new EventEmitter<string>();
  @Output() rangeChange = new EventEmitter<CalendarRangeSelection>();
  @Output() monthChange = new EventEmitter<{ year: number; month: number }>();

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  private rangeAnchor = '';

  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']?.currentValue) {
      this.syncViewToDate(String(changes['selectedDate'].currentValue));
    }
    if (changes['rangeStart']?.currentValue || changes['rangeEnd']?.currentValue) {
      const anchor = this.rangeStart || this.rangeEnd;
      if (anchor) {
        this.syncViewToDate(anchor);
      }
    }
  }

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth, 1).toLocaleString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  get calendarCells(): Array<{ date: string | null; day: number | null; markers: CalendarDayMarker[] }> {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const cells: Array<{ date: string | null; day: number | null; markers: CalendarDayMarker[] }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: null, day: null, markers: [] });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = toLocalIsoDate(new Date(this.viewYear, this.viewMonth, day));
      cells.push({
        date,
        day,
        markers: this.markers.filter((marker) => marker.date === date),
      });
    }

    return cells;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
    this.monthChange.emit({ year: this.viewYear, month: this.viewMonth + 1 });
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
    this.monthChange.emit({ year: this.viewYear, month: this.viewMonth + 1 });
  }

  goToday(): void {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    const iso = toLocalIsoDate(today);
    if (!this.isDisabled(iso)) {
      this.selectDate(iso);
    }
    this.monthChange.emit({ year: this.viewYear, month: this.viewMonth + 1 });
  }

  selectDate(date: string | null): void {
    if (!date || this.isDisabled(date)) {
      return;
    }

    this.syncViewToDate(date);

    if (this.enableRangeSelection) {
      this.selectRangeDate(date);
      return;
    }

    this.selectedDate = date;
    this.selectedDateChange.emit(date);
  }

  isSelected(date: string | null): boolean {
    if (!date) {
      return false;
    }
    if (this.enableRangeSelection) {
      return date === this.rangeStart || date === this.rangeEnd;
    }
    return date === this.selectedDate;
  }

  isInRange(date: string | null): boolean {
    if (!date || !this.enableRangeSelection || !this.rangeStart || !this.rangeEnd) {
      return false;
    }
    const { start, end } = normalizeLocalDateRange(this.rangeStart, this.rangeEnd);
    return compareLocalIsoDates(date, start) >= 0 && compareLocalIsoDates(date, end) <= 0;
  }

  isDisabled(date: string | null): boolean {
    if (!date) {
      return true;
    }
    if (this.minSelectableDate && compareLocalIsoDates(date, this.minSelectableDate) < 0) {
      return true;
    }
    return false;
  }

  isToday(date: string | null): boolean {
    return !!date && date === toLocalIsoDate(new Date());
  }

  private selectRangeDate(date: string): void {
    if (!this.rangeAnchor) {
      this.rangeAnchor = date;
      this.emitRange(date, date);
      return;
    }

    const { start, end } = normalizeLocalDateRange(this.rangeAnchor, date);
    this.rangeAnchor = '';
    this.emitRange(start, end);
  }

  private emitRange(start: string, end: string): void {
    this.rangeStart = start;
    this.rangeEnd = end;
    this.selectedDate = start;
    this.rangeChange.emit({ start, end });
    this.selectedDateChange.emit(start);
  }

  private syncViewToDate(isoDate: string): void {
    const parsed = parseLocalIsoDate(isoDate);
    this.viewYear = parsed.getFullYear();
    this.viewMonth = parsed.getMonth();
  }
}
