import { Routes } from '@angular/router';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/teacher-shell/teacher-shell.component').then(m => m.TeacherShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'course/:courseId/edit',
        loadComponent: () => import('./course-editor/section-composer/section-composer.component').then(m => m.SectionComposerComponent),
      },
    ],
  },
];
