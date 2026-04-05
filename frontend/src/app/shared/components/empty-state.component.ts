import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatButtonModule, LucideAngularModule],
  template: `
    <article class="empty-state card">
      <lucide-icon [name]="icon" [size]="30"></lucide-icon>

      <h3>{{ title }}</h3>
      <p>{{ subtitle }}</p>

      @if (buttonText) {
        <button mat-flat-button type="button" class="action-btn" (click)="buttonAction.emit()">
          {{ buttonText }}
        </button>
      }
    </article>
  `,
  styles: [
    `
      .empty-state {
        min-height: 200px;
        display: grid;
        place-content: center;
        justify-items: center;
        text-align: center;
        gap: 0.6rem;
        color: var(--text-sub);
      }

      h3 {
        margin: 0;
        color: var(--navy-dark);
        font-size: 1.02rem;
      }

      p {
        margin: 0;
        max-width: 440px;
      }

      .action-btn {
        margin-top: 0.2rem;
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'info';
  @Input() title = 'Không có dữ liệu';
  @Input() subtitle = 'Hiện chưa có dữ liệu để hiển thị.';
  @Input() buttonText = '';

  @Output() readonly buttonAction = new EventEmitter<void>();
}
