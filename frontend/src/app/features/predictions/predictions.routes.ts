import { Routes } from '@angular/router';

export const PREDICTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./class-predictions.component').then((m) => m.ClassPredictionsComponent),
  },
  {
    path: 'report/:gradeId',
    loadComponent: () =>
      import('./prediction-report.component').then((m) => m.PredictionReportComponent),
  },
];
