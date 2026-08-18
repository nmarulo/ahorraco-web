import { Component, inject } from '@angular/core';

import { ThemePreference, ThemeService } from '@app/services/layout/theme.service';

@Component({
  selector: 'app-header',
  host: { class: 'app-header navbar navbar-expand bg-body' },
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  private readonly theme = inject(ThemeService);

  /** Lo que hay elegido ahora mismo: marca el icono y la opción activa. */
  protected readonly preference = this.theme.preference;

  /** Cambia el tema de color. */
  protected useTheme(preference: ThemePreference): void {
    this.theme.use(preference);
  }
}
