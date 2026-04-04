import { Component } from '@angular/core';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  template: `
    <section class="container" style="padding-block: 24px;">
      <h1>Notifications</h1>
      <p>Danh sach thong bao se duoc bo sung o ngay 12.</p>
    </section>
  `,
})
export class NotificationListComponent {}
