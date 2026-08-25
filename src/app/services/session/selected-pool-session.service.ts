import { Injectable, signal } from '@angular/core';

export interface SelectedPool {
  readonly publicId: string;

  readonly name: string;
}

/**
 * Establece la porra seleccionada para toda la sesión.
 */
@Injectable({ providedIn: 'root' })
export class SelectedPoolSession {
  private static readonly KEY = 'ahorraco-selected-pool';

  private readonly state = signal<SelectedPool | null>(SelectedPoolSession.read());

  readonly current = this.state.asReadonly();

  select(pool: SelectedPool): void {
    this.state.set(pool);

    try {
      localStorage.setItem(SelectedPoolSession.KEY, JSON.stringify(pool));
    } catch {
      //Se ignora el error.
    }
  }

  clear(): void {
    this.state.set(null);

    try {
      localStorage.removeItem(SelectedPoolSession.KEY);
    } catch {
      //Se ignora el error.
    }
  }

  private static read(): SelectedPool | null {
    try {
      const raw = localStorage.getItem(SelectedPoolSession.KEY);

      return raw ? (JSON.parse(raw) as SelectedPool) : null;
    } catch {
      return null;
    }
  }
}
