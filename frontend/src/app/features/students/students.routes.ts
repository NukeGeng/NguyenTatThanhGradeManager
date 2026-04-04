import { Routes } from '@angular/router';
import { StudentListComponent } from './student-list.component';

export const STUDENTS_ROUTES: Routes = [
  {
    path: '',
    component: StudentListComponent,
  },
  {
    path: 'new',
    loadComponent: () => import('./student-form.component').then((m) => m.StudentFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./student-form.component').then((m) => m.StudentFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./student-detail.component').then((m) => m.StudentDetailComponent),
  },
];
