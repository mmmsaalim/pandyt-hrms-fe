import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-edit-dialog-shell',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './edit-dialog-shell.component.html',
  styleUrl: './edit-dialog-shell.component.scss',
})
export class EditDialogShellComponent {
  @Input() title = 'Edit';
  @Input() subtitle = '';
  @Input() submitText = 'Save changes';
  @Input() cancelText = 'Cancel';
  @Input() busy = false;
  @Input() disableSubmit = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
