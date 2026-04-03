import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  template: `
    <section style="padding: 24px">
      <h1>Dang ky giao vien</h1>
      <p>Trang register duoc tao san de lazy load route.</p>
      <a routerLink="/login">Quay ve dang nhap</a>
    </section>
  `,
})
export class RegisterComponent {}
