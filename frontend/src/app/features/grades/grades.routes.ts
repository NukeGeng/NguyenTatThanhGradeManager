import { Routes } from '@angular/router';

export const GRADES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./grade-entry/grade-entry.component').then((m) => m.GradeEntryComponent),
  },
  {
    path: 'import',
    loadComponent: () =>
      import('./grade-import/grade-import.component').then((m) => m.GradeImportComponent),
  },
];
