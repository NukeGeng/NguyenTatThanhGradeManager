import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Thông báo</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Hệ thống thông báo</p>
          <h1 class="page-title">Thông báo</h1>
          <p class="subtitle">Danh sách thông báo sẽ được kết nối API đầy đủ ở bước kế tiếp.</p>
        </div>
      </header>

      <section class="content-card">
        <div class="empty-state">
          <lucide-icon name="bell" [size]="36"></lucide-icon>
          <h3>Chưa có thông báo</h3>
          <p>Trang này đã được chuẩn hóa layout theo template và sẵn sàng nối dữ liệu thật.</p>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }

      .content-card {
        padding: 1rem 1.1rem 1.1rem;
      }
    `,
  ],
})
export class NotificationListComponent {}
