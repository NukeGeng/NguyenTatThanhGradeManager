import { Routes } from '@angular/router';

export const CURRICULA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./curriculum-list.component').then((m) => m.CurriculumListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./curriculum-detail.component').then((m) => m.CurriculumDetailComponent),
  },
];
