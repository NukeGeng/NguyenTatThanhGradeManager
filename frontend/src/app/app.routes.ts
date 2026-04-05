import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminOnlyGuard } from './core/guards/admin-only.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'departments',
    canActivate: [authGuard, adminOnlyGuard],
    loadChildren: () =>
      import('./features/departments/departments.routes').then((m) => m.DEPARTMENTS_ROUTES),
  },
  {
    path: 'users',
    canActivate: [authGuard, adminOnlyGuard],
    loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
  },
  {
    path: 'subjects',
    canActivate: [authGuard, adminOnlyGuard],
    loadChildren: () =>
      import('./features/subjects/subjects.routes').then((m) => m.SUBJECTS_ROUTES),
  },
  {
    path: 'students',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/students/students.routes').then((m) => m.STUDENTS_ROUTES),
  },
  {
    path: 'classes',
    canActivate: [authGuard],
    loadChildren: () => import('./features/classes/classes.routes').then((m) => m.CLASSES_ROUTES),
  },
  {
    path: 'grades',
    canActivate: [authGuard],
    loadChildren: () => import('./features/grades/grades.routes').then((m) => m.GRADES_ROUTES),
  },
  {
    path: 'predictions',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/predictions/predictions.routes').then((m) => m.PREDICTIONS_ROUTES),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/notifications/notifications.routes').then((m) => m.NOTIFICATIONS_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
