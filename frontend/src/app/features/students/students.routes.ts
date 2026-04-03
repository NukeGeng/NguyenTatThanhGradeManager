import { Routes } from '@angular/router';
import { StudentListComponent } from './student-list.component';

export const STUDENTS_ROUTES: Routes = [
  {
    path: '',
    component: StudentListComponent,
  },
];
