import { Routes } from '@angular/router';

export const KARDEX_ROUTES: Routes = [
  {
    path: '',
    title: 'Kárdex | Almacén UNSM',
    loadComponent: () =>
      import('./pages/kardex-main/kardex-main.component').then(
        (m) => m.KardexMainComponent,
      ),
  },
];
