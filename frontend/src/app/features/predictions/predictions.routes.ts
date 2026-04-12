import { Routes } from '@angular/router';

export const PREDICTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./class-predictions.component').then((m) => m.ClassPredictionsComponent),
  },
];
