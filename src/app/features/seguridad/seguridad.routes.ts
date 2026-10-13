import { Routes } from '@angular/router';
import { moduleGuard } from '../../core/guards';

export const SEGURIDAD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'usuarios',
  },
  {
    path: 'usuarios',
    title: 'Usuarios | Almacén UNSM',
    canActivate: [moduleGuard('SEGURIDAD_USUARIOS')],
    loadComponent: () =>
      import('./pages/usuarios-list/usuarios-list.component').then((m) => m.UsuariosListComponent),
  },
  {
    path: 'perfiles',
    title: 'Perfiles y Permisos | Almacén UNSM',
    canActivate: [moduleGuard('SEGURIDAD_PERFILES')],
    loadComponent: () =>
      import('./pages/perfiles-list/perfiles-list.component').then((m) => m.PerfilesListComponent),
  },
];
