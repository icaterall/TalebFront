import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/student-shell/student-shell.component').then(m => m.StudentShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
      },
      {
        path: 'courses',
        loadComponent: () => import('./courses/student-courses.component').then(m => m.StudentCoursesComponent),
      },
      {
        path: 'assignments',
        loadComponent: () => import('./assignments/student-assignments.component').then(m => m.StudentAssignmentsComponent),
      },
      {
        path: 'quizzes',
        loadComponent: () => import('./quizzes/student-quizzes.component').then(m => m.StudentQuizzesComponent),
      },
      {
        path: 'grades',
        loadComponent: () => import('./grades/student-grades.component').then(m => m.StudentGradesComponent),
      },
      {
        path: 'calendar',
        loadComponent: () => import('./calendar/student-calendar.component').then(m => m.StudentCalendarComponent),
      },
      {
        path: 'library',
        loadComponent: () => import('./library/student-library.component').then(m => m.StudentLibraryComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/student-profile.component').then(m => m.StudentProfileComponent),
      }
    ],
  },
];
