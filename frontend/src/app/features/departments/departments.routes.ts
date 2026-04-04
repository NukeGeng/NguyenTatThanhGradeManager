import { Routes } from '@angular/router';

import { DepartmentListComponent } from './department-list.component';
import { DepartmentDetailComponent } from './department-detail.component';

export const DEPARTMENTS_ROUTES: Routes = [
  {
    path: '',
    component: DepartmentListComponent,
  },
  {
    path: ':id',
    component: DepartmentDetailComponent,
  },
];
