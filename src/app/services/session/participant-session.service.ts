import { Injectable } from '@angular/core';

/** Quién dice ser la persona que está usando el navegador, en una porra. */
export interface ParticipantIdentity {
  readonly participantId: string;

  readonly fullName: string;

  /**
   * Token propio, solo si se unió desde este mismo navegador. Quien llega
   * eligiendo su nombre de la lista no lo tiene.
   */
  readonly participantToken?: string;
}

/**
 * Recuerda con qué participante se está usando cada porra.
 *
 * Ahorraco no tiene login: cada persona se identifica eligiendo su nombre de la
 * lista del grupo, y quien se une desde este navegador recibe además su
 * `participantToken`. Guardarlo aquí evita tener que elegirse el nombre en cada
 * pantalla y en cada visita.
 *
 * Va en `localStorage` y no en `sessionStorage` a propósito: la gracia de no
 * tener contraseñas es que al volver dentro de un mes sigas dentro.
 *
 * El código de gestión del organizador acabará viviendo al lado de esto, cuando
 * se decida dónde lo introduce.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantSession {
  private static readonly KEY_PREFIX = 'ahorraco-participant:';

  /** Con quién se está usando esta porra, si ya se ha elegido. */
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
      // Sin almacenamiento habrá que elegirse el nombre cada vez, pero la app
      // sigue funcionando.
    }
  }

  /** Olvida la identidad: es el «no soy yo» de la pantalla de pago. */
  clear(poolId: string): void {
    try {
      localStorage.removeItem(this.keyFor(poolId));
    } catch {
      // Nada que hacer si el navegador no deja tocar el almacenamiento.
    }
  }

  /** Una clave por porra: se puede participar en varias a la vez. */
  private keyFor(poolId: string): string {
    return `${ParticipantSession.KEY_PREFIX}${poolId}`;
  }
}
