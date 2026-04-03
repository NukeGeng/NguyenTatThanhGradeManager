import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section style="padding: 24px">
      <h1>Dang nhap</h1>
      <p>Trang login se duoc bo sung UI o Prompt 8.2.</p>
      <a routerLink="/login/register">Tao tai khoan giao vien</a>
    </section>
  `,
})
export class LoginComponent {}
