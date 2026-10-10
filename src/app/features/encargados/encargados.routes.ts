import { Routes } from '@angular/router';
import { moduleGuard } from '../../core/guards';

export const ENCARGADOS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'jefe',
  },
  {
    path: 'jefe',
    title: 'Jefe de Almacén | Almacén UNSM',
    canActivate: [moduleGuard('ENCARGADOS_JEFE')],
    loadComponent: () =>
      import('./pages/jefe-list/jefe-list.component').then((m) => m.JefeListComponent),
  },
  {
    path: 'almacen',
    title: 'Encargados de Almacén | Almacén UNSM',
    canActivate: [moduleGuard('ENCARGADOS_ALMACEN')],
    loadComponent: () =>
      import('./pages/almacen-list/almacen-list.component').then((m) => m.AlmacenListComponent),
  },
];
