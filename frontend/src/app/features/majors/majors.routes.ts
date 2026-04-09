import { Routes } from '@angular/router';

export const MAJORS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./major-list.component').then((m) => m.MajorListComponent),
  },
];
