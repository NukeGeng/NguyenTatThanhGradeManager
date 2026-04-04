import { Routes } from '@angular/router';

import { UserListComponent } from './user-list.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: UserListComponent,
  },
];
