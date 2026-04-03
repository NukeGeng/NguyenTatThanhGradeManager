import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
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
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
