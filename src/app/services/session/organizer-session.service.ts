import { Injectable } from '@angular/core';

/**
 * Gestión del código del organizador.
 */
@Injectable({ providedIn: 'root' })
export class OrganizerSession {
  private static readonly KEY_PREFIX = 'ahorraco-organizer:';

  get(poolId: string): string | null {
    try {
      return localStorage.getItem(this.keyFor(poolId));
    } catch {
      return null;
    }
  }

  save(poolId: string, managementCode: string): void {
    try {
      localStorage.setItem(this.keyFor(poolId), managementCode);
    } catch {
      //Se ignora el error.
    }
  }

  clear(poolId: string): void {
    try {
      localStorage.removeItem(this.keyFor(poolId));
    } catch {
      //Se ignora el error.
    }
  }

  private keyFor(poolId: string): string {
    return `${OrganizerSession.KEY_PREFIX}${poolId}`;
  }
}
