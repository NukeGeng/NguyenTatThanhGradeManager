import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminOnlyGuard } from './core/guards/admin-only.guard';
import { adminGuard } from './core/guards/admin.guard';
import { advisorGuard } from './core/guards/advisor.guard';

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
    path: 'news',
    loadComponent: () => import('./features/news/news.component').then((m) => m.NewsComponent),
  },
  {
    path: 'news/:slug',
    loadComponent: () =>
      import('./features/news/news-category.component').then((m) => m.NewsCategoryComponent),
  },
  {
    path: 'news/:category/:id',
    loadComponent: () =>
      import('./features/news/news-detail.component').then((m) => m.NewsDetailComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/users/teacher-profile.component').then((m) => m.TeacherProfileComponent),
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
    path: 'majors',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/majors/majors.routes').then((m) => m.MAJORS_ROUTES),
  },
  {
    path: 'curricula',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/curricula/curricula.routes').then((m) => m.CURRICULA_ROUTES),
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
    path: 'advisor',
    canActivate: [authGuard, advisorGuard],
    loadChildren: () => import('./features/advisor/advisor.routes').then((m) => m.ADVISOR_ROUTES),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadChildren: () => import('./features/chat/chat.routes').then((m) => m.CHAT_ROUTES),
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./features/support/support.component').then((m) => m.SupportComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
