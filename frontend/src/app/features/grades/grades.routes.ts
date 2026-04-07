import { Routes } from '@angular/router';

export const GRADES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./grade-entry/grade-entry.component').then((m) => m.GradeEntryComponent),
  },
  {
    path: 'class-sheet',
    loadComponent: () =>
      import('./class-grade-sheet/class-grade-sheet.component').then(
        (m) => m.ClassGradeSheetComponent,
      ),
  },
  {
    path: 'import',
    loadComponent: () =>
      import('./grade-import/grade-import.component').then((m) => m.GradeImportComponent),
  },
];
