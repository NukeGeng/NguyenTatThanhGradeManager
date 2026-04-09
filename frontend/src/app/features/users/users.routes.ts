import { Routes } from '@angular/router';

import { UserListComponent } from './user-list.component';

export const USERS_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./teacher-profile.component').then((m) => m.TeacherProfileComponent),
  },
  {
    path: '',
    component: UserListComponent,
    pathMatch: 'full',
  },
];
