import { Injectable } from '@angular/core';

export interface ParticipantIdentity {
  /**
   * Identificador público del participante.
   */
  readonly participantPublicId: string;

  readonly fullName: string;
}

/**
 * Gestión de la identidad del participante.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantSession {
  private static readonly KEY_PREFIX = 'ahorraco-participant:';

  /**
   * @return Retorna nulo si no hay identidad guardada o el participante no ha indicado quien es.
   */
  get(poolId: string): ParticipantIdentity | null {
    try {
      const raw = localStorage.getItem(this.keyFor(poolId));

      return raw ? (JSON.parse(raw) as ParticipantIdentity) : null;
    } catch {
      return null;
    }
  }

  /** Recuerda con quién se está usando esta porra. */
  save(poolId: string, identity: ParticipantIdentity): void {
    try {
      localStorage.setItem(this.keyFor(poolId), JSON.stringify(identity));
    } catch {
      //Se ignora el error.
    }
  }

  /** Olvida la identidad: es el «no soy yo» de la pantalla de pago. */
  clear(poolId: string): void {
    try {
      localStorage.removeItem(this.keyFor(poolId));
    } catch {
      //Se ignora el error.
    }
  }

  private keyFor(poolId: string): string {
    return `${ParticipantSession.KEY_PREFIX}${poolId}`;
  }
}
