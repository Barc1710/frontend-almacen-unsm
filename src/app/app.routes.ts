import { Routes } from '@angular/router';
import { authGuard, landingGuard, moduleGuard, publicGuard } from './core/guards';

const loadAccessStatus = () =>
  import('./features/auth/access-status.component').then((m) => m.AccessStatusComponent);

const loadDashboard = () =>
  import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent);

const loadArticulos = () =>
  import('./features/articulos/pages/articulos-list/articulos-list.component').then(
    (m) => m.ArticulosListComponent,
  );

const loadIngresos = () =>
  import('./features/ingresos/pages/ingresos-list/ingresos-list.component').then(
    (m) => m.IngresosListComponent,
  );

const loadEgresos = () =>
  import('./features/egresos/pages/egresos-list/egresos-list.component').then(
    (m) => m.EgresosListComponent,
  );

const loadProveedores = () =>
  import('./features/proveedores/proveedores.component').then((m) => m.ProveedoresComponent);

const loadClientes = () =>
  import('./features/clientes/clientes.component').then((m) => m.ClientesComponent);

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
      {
        path: 'inventario/articulos',
        canActivate: [moduleGuard('INVENTARIO_ARTICULOS')],
        loadComponent: loadArticulos,
      },
      { path: 'inventario', pathMatch: 'full', redirectTo: 'inventario/articulos' },
      { path: 'articulos', pathMatch: 'full', redirectTo: 'inventario/articulos' },
      { path: 'ingresos', canActivate: [moduleGuard('INGRESOS')], loadComponent: loadIngresos },
      { path: 'egresos', canActivate: [moduleGuard('EGRESOS')], loadComponent: loadEgresos },
      { path: 'despachos', pathMatch: 'full', redirectTo: 'egresos' },
      {
        path: 'proveedores',
        canActivate: [moduleGuard('PROVEEDORES')],
        loadComponent: loadProveedores,
      },
      { path: 'mantenimiento/proveedores', pathMatch: 'full', redirectTo: 'proveedores' },
      {
        path: 'clientes',
        canActivate: [moduleGuard('CLIENTES')],
        loadComponent: loadClientes,
      },
      { path: 'mantenimiento/clientes', pathMatch: 'full', redirectTo: 'clientes' },
      { path: 'cambiar-clave', pathMatch: 'full', redirectTo: '' },
      // Rutas dinámicas universales para módulos y submódulos cargados desde la base de datos
      { path: ':modulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
      { path: ':seccion/:submodulo', canActivate: [moduleGuard()], loadComponent: loadDashboard },
    ],
  },
  { path: '**', redirectTo: '' },
];
