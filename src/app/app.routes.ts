import { Routes } from '@angular/router';
import { authGuard, landingGuard, moduleGuard, publicGuard } from './core/guards';

const loadAccessStatus = () =>
  import('./features/auth/access-status.component').then((m) => m.AccessStatusComponent);

const loadDashboard = () =>
  import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent);

const loadInventario = () =>
  import('./features/articulos/pages/articulos-list/articulos-list.component').then(
    (m) => m.ArticulosListComponent,
  );

const loadIngresos = () =>
  import('./features/ingresos/pages/ingresos-list/ingresos-list.component').then(
    (m) => m.IngresosListComponent,
  );

export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [landingGuard], loadComponent: loadAccessStatus },
      { path: 'sin-acceso', loadComponent: loadAccessStatus },
      { path: 'dashboard', canActivate: [moduleGuard()], loadComponent: loadDashboard },
      { path: 'inventario', canActivate: [moduleGuard('INVENTARIO')], loadComponent: loadInventario },
      { path: 'articulos', pathMatch: 'full', redirectTo: 'inventario' },
      { path: 'ingresos', canActivate: [moduleGuard('INGRESOS')], loadComponent: loadIngresos },
      { path: 'cambiar-clave', pathMatch: 'full', redirectTo: '' },
      // Rutas dinámicas universales para módulos y submódulos cargados desde la base de datos
      { path: ':modulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
      { path: ':seccion/:submodulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
    ],
  },
  { path: '**', redirectTo: '' },
];
