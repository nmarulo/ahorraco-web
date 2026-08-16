import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * Cambia el armazón del `<body>` según la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class BodyShellService {
  /** Armazón de la aplicación con cabecera y menú lateral. */
  private static readonly APP_SHELL = ['layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary'];

  /** Armazón centrado y sin menú, para la pantalla de unirse. */
  private static readonly LOGIN_SHELL = ['login-page', 'bg-body-secondary'];

  private readonly document = inject(DOCUMENT);

  /** Deja el `<body>` con el armazón de la aplicación. */
  useAppShell(): void {
    this.apply(BodyShellService.APP_SHELL);
  }

  /** Deja el `<body>` con el armazón centrado de tipo login. */
  useLoginShell(): void {
    this.apply(BodyShellService.LOGIN_SHELL);
  }

  /** Quita el armazón anterior y pone el pedido, sin tocar otras clases. */
  private apply(shell: readonly string[]): void {
    const body = this.document.body;
    const allShells = [...BodyShellService.APP_SHELL, ...BodyShellService.LOGIN_SHELL];

    body.classList.remove(...allShells);
    body.classList.add(...shell);
  }
}
