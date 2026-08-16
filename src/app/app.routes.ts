import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'create-pool',
    title: 'Ahorraco · Crear una porra',
    loadComponent: () =>
      import('@app/modules/pools/pages/create-pool/create-pool').then((m) => m.CreatePool)
  },
  // Mientras I-01 sea la única pantalla, la raíz entra directamente en ella.
  { path: '', pathMatch: 'full', redirectTo: 'create-pool' },
  { path: '**', redirectTo: '' }
];
