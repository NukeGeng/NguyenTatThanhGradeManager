import { Routes } from '@angular/router';

export const ADVISOR_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'students',
  },
  {
    path: 'students',
    loadComponent: () =>
      import('./advisor-students.component').then((m) => m.AdvisorStudentsComponent),
  },
  {
    path: 'students/:id',
    loadComponent: () =>
      import('./advisor-student-detail.component').then((m) => m.AdvisorStudentDetailComponent),
  },
];
