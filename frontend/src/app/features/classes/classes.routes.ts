import { Routes } from '@angular/router';
import { ClassListComponent } from './class-list.component';

export const CLASSES_ROUTES: Routes = [
  {
    path: '',
    component: ClassListComponent,
  },
  {
    path: ':id',
    loadComponent: () => import('./class-detail.component').then((m) => m.ClassDetailComponent),
  },
];
