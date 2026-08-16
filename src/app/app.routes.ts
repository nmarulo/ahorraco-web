import { Routes } from '@angular/router';

import { AppWrapper } from '@app/layout/app-wrapper/app-wrapper';

export const routes: Routes = [
  {
    path: 'join/:invitationToken',
    title: 'Ahorraco · Unirse a la porra',
    loadComponent: () =>
      import('@app/modules/pools/pages/join-pool/join-pool').then((m) => m.JoinPool)
  },
  {
    path: '',
    component: AppWrapper,
    children: [
      {
        path: 'create-pool',
        title: 'Ahorraco · Crear una porra',
        loadComponent: () =>
          import('@app/modules/pools/pages/create-pool/create-pool').then((m) => m.CreatePool)
      },
      {
        path: 'pools/:poolId/invite',
        title: 'Ahorraco · Invitar participantes',
        loadComponent: () =>
          import('@app/modules/pools/pages/invite-participants/invite-participants').then(
            (m) => m.InviteParticipants
          )
      },
      {
        path: 'pools/:poolId/draw',
        title: 'Ahorraco · Sorteo del orden',
        loadComponent: () =>
          import('@app/modules/pools/pages/draw-order/draw-order').then((m) => m.DrawOrder)
      },
      { path: '', pathMatch: 'full', redirectTo: 'create-pool' }
    ]
  },
  { path: '**', redirectTo: '' }
];
