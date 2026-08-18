import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

/** Lo que elige la persona. `auto` sigue al sistema operativo. */
export type ThemePreference = 'light' | 'dark' | 'auto';

/**
 * Tema claro/oscuro de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** La misma que usa AdminLTE. */
  private static readonly STORAGE_KEY = 'lte-theme';

  private static readonly DARK_QUERY = '(prefers-color-scheme: dark)';

  private readonly document = inject(DOCUMENT);

  /** Referencia viva a la consulta del sistema; ver `watchSystem()`. */
  private darkQuery: MediaQueryList | null = null;

  private readonly preferred = signal<ThemePreference>(this.readStored());

  /** Si el sistema operativo pide oscuro; solo importa cuando se elige `auto`. */
  private readonly systemPrefersDark = signal(this.matchesDark());

  /** Lo que ha elegido la persona, tal cual. */
  readonly preference = this.preferred.asReadonly();

  /** El tema que se acaba pintando, ya resuelto el `auto`. */
  readonly resolved = computed<'light' | 'dark'>(() => {
    const preference = this.preferred();

    if (preference !== 'auto') {
      return preference;
    }

    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    this.watchSystem();
    effect(() => this.applyToDocument(this.resolved()));
  }

  /** Cambia el tema y lo recuerda para la próxima visita. */
  use(preference: ThemePreference): void {
    this.preferred.set(preference);

    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, preference);
    } catch {
      // Sin almacenamiento el tema se pierde al recargar, pero funciona.
    }
  }

  /** Escribe el tema en el `<html>`, igual que hace `public/theme.js`. */
  private applyToDocument(theme: 'light' | 'dark'): void {
    const root = this.document.documentElement;

    root.setAttribute('data-bs-theme', theme);
    // Hace que el navegador pinte acorde los controles nativos.
    root.style.colorScheme = theme;
  }

  /**
   * Con `auto`, seguir al sistema aunque cambie con la app abierta.
   *
   * La `MediaQueryList` se guarda en un campo a propósito: si solo viviera como
   * variable local, el navegador puede recogerla como basura y llevarse el
   * listener con ella, y el tema dejaría de seguir al sistema sin previo aviso.
   */
  private watchSystem(): void {
    this.darkQuery = this.document.defaultView?.matchMedia(ThemeService.DARK_QUERY) ?? null;
    this.darkQuery?.addEventListener('change', (event) =>
      this.systemPrefersDark.set(event.matches)
    );
  }

  private matchesDark(): boolean {
    return this.document.defaultView?.matchMedia(ThemeService.DARK_QUERY).matches ?? false;
  }

  /** Lo guardado, si vale; si no, `auto`. */
  private readStored(): ThemePreference {
    try {
      const stored = localStorage.getItem(ThemeService.STORAGE_KEY);

      return stored === 'light' || stored === 'dark' ? stored : 'auto';
    } catch {
      return 'auto';
    }
  }
}
