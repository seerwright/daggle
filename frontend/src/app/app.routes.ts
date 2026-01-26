import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'competitions',
        loadComponent: () =>
          import('./pages/competitions/competition-list/competition-list.component').then(
            (m) => m.CompetitionListComponent
          ),
      },
      {
        path: 'competitions/create',
        loadComponent: () =>
          import('./pages/competitions/competition-create/competition-create.component').then(
            (m) => m.CompetitionCreateComponent
          ),
      },
      {
        path: 'competitions/:slug',
        loadComponent: () =>
          import('./pages/competitions/competition-detail/competition-detail.component').then(
            (m) => m.CompetitionDetailComponent
          ),
      },
      {
        path: 'profile/edit',
        loadComponent: () =>
          import('./pages/profile/profile-edit/profile-edit.component').then(
            (m) => m.ProfileEditComponent
          ),
      },
      {
        path: 'users/:username',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/register/register.component').then(
            (m) => m.RegisterComponent
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent
          ),
      },
    ],
  },
];
