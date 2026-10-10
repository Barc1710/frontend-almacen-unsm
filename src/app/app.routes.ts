import { Routes } from '@angular/router';
import { authGuard, landingGuard, moduleGuard, publicGuard } from './core/guards';

const loadAccessStatus = () =>
  import('./features/auth/access-status.component').then((m) => m.AccessStatusComponent);

const loadDashboard = () =>
  import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent);

export const routes: Routes = [
  {
    path: 'auth/login',
    title: 'Iniciar Sesión | Almacén UNSM',
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
      {
        path: '',
        pathMatch: 'full',
        canActivate: [landingGuard],
        loadComponent: loadAccessStatus,
      },
      {
        path: 'sin-acceso',
        title: 'Sin Acceso | Almacén UNSM',
        loadComponent: loadAccessStatus,
      },
      {
        path: 'dashboard',
        title: 'Dashboard | Almacén UNSM',
        canActivate: [moduleGuard('DASHBOARD')],
        loadComponent: loadDashboard,
      },
      {
        path: 'inventario/articulos',
        title: 'Artículos | Almacén UNSM',
        canActivate: [moduleGuard('INVENTARIO_ARTICULOS')],
        loadComponent: () =>
          import('./features/articulos/pages/articulos-list/articulos-list.component').then(
            (m) => m.ArticulosListComponent,
          ),
      },
      {
        path: 'inventario/familias',
        title: 'Familias | Almacén UNSM',
        canActivate: [moduleGuard('INVENTARIO_FAMILIAS')],
        loadComponent: () =>
          import(
            './features/familias-marcas/pages/familias-list/familias-list.component'
          ).then((m) => m.FamiliasListComponent),
      },
      {
        path: 'inventario/marcas',
        title: 'Marcas | Almacén UNSM',
        canActivate: [moduleGuard('INVENTARIO_MARCAS')],
        loadComponent: () =>
          import(
            './features/familias-marcas/pages/marcas-list/marcas-list.component'
          ).then((m) => m.MarcasListComponent),
      },
      { path: 'inventario', pathMatch: 'full', redirectTo: '/inventario/articulos' },
      { path: 'articulos', pathMatch: 'full', redirectTo: '/inventario/articulos' },
      { path: 'familias', pathMatch: 'full', redirectTo: '/inventario/familias' },
      { path: 'marcas', pathMatch: 'full', redirectTo: '/inventario/marcas' },
      {
        path: 'ingresos',
        title: 'Ingresos | Almacén UNSM',
        canActivate: [moduleGuard('INGRESOS')],
        loadComponent: () =>
          import('./features/ingresos/pages/ingresos-list/ingresos-list.component').then(
            (m) => m.IngresosListComponent,
          ),
      },
      {
        path: 'egresos',
        title: 'Egresos | Almacén UNSM',
        canActivate: [moduleGuard('EGRESOS')],
        loadComponent: () =>
          import('./features/egresos/pages/egresos-list/egresos-list.component').then(
            (m) => m.EgresosListComponent,
          ),
      },
      { path: 'despachos', pathMatch: 'full', redirectTo: '/egresos' },
      {
        path: 'kardex',
        canActivate: [moduleGuard('KARDEX')],
        loadChildren: () =>
          import('./features/kardex/kardex.routes').then((m) => m.KARDEX_ROUTES),
      },
      {
        path: 'encargados',
        canActivate: [moduleGuard('ENCARGADOS')],
        loadChildren: () =>
          import('./features/encargados/encargados.routes').then((m) => m.ENCARGADOS_ROUTES),
      },
      { path: 'responsables', pathMatch: 'full', redirectTo: '/encargados/jefe' },
      { path: 'personal-firmante', pathMatch: 'full', redirectTo: '/encargados/jefe' },
      { path: 'cambiar-clave', pathMatch: 'full', redirectTo: '/' },
      // Rutas dinámicas universales para módulos y submódulos cargados desde la base de datos
      { path: ':modulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
      { path: ':seccion/:submodulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
    ],
  },
  { path: '**', redirectTo: '/' },
];
