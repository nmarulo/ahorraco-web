import { Injectable } from '@angular/core';

/**
 * Participante tal y como lo guarda el almacén simulado.
 *
 * Interfaz auxiliar del almacén: no es un DTO de la API, esos viven en
 * `app/models/`.
 */
export interface StoredParticipant {
  participantId: string;
  participantToken: string;
  fullName: string;
  phone?: string;
}

/** Un turno del orden de cobro ya sorteado. */
export interface StoredTurn {
  position: number;
  participantId: string;
  /** Mes en que cobra, en formato `AAAA-MM`. */
  month: string;
  /** Si la posición se reservó en vez de sortearse (organizador primero). */
  pinned: boolean;
}

/** La cuota de un participante en un mes concreto. */
export interface StoredPayment {
  participantId: string;
  /** Mes de la cuota, en formato `AAAA-MM`. */
  month: string;
  /** El participante ha dicho que ya pagó (I-05). */
  marked: boolean;
  /** El organizador ha dado el pago por recibido (I-06). */
  confirmed: boolean;
}

/** Porra tal y como la guarda el almacén simulado. */
export interface StoredPool {
  poolId: string;
  managementCode: string;
  invitationToken: string;
  name: string;
  monthlyFee: number;
  numParticipants: number;
  startDate: string;
  paymentDueDay: string;
  notes?: string;
  participants: StoredParticipant[];
  payments: StoredPayment[];
  /** Vacío mientras no se haya sorteado; el sorteo se hace una sola vez. */
  turns: StoredTurn[];
  /**
   * Cuál de los participantes es el organizador.
   *
   * Solo se sabe si él mismo lo dice al sortear: como se une por el enlace
   * igual que todos, nada enlaza su `managementCode` con su participante.
   */
  organizerParticipantId?: string;
}

/**
 * Base de datos de mentira mientras `ahorraco-api` no existe.
 *
 * **Esta carpeta entera (`shared/mock/`) se borra al conectar la API real.**
 * Está aparte de `services/pages/` a propósito: allí van clientes HTTP, y esto
 * es lo contrario — el sustituto del servidor. Guarda en `sessionStorage` para
 * que el flujo crear → invitar → unirse sobreviva a un F5 mientras se prueba;
 * al cerrar la pestaña se olvida todo.
 */
@Injectable({ providedIn: 'root' })
export class PoolsMockStore {
  private static readonly STORAGE_KEY = 'ahorraco-mock-pools';

  /** Guarda una porra nueva. */
  savePool(pool: StoredPool): void {
    const pools = this.readAll();
    pools.push(pool);
    this.writeAll(pools);
  }

  /** Busca una porra por su identificador. */
  findById(poolId: string): StoredPool | null {
    return this.readAll().find((pool) => pool.poolId === poolId) ?? null;
  }

  /** Busca una porra por el token de su enlace de invitación. */
  findByInvitationToken(invitationToken: string): StoredPool | null {
    return this.readAll().find((pool) => pool.invitationToken === invitationToken) ?? null;
  }

  /** Añade un participante a una porra ya existente. */
  addParticipant(poolId: string, participant: StoredParticipant): void {
    const pools = this.readAll();
    const pool = pools.find((candidate) => candidate.poolId === poolId);
    if (!pool) {
      return;
    }

    pool.participants.push(participant);
    this.writeAll(pools);
  }

  /**
   * Marca que un participante ha pagado su cuota de un mes. Crea el registro si
   * es la primera vez que se toca ese mes.
   */
  markPayment(poolId: string, participantId: string, month: string): void {
    const pools = this.readAll();
    const pool = pools.find((candidate) => candidate.poolId === poolId);
    if (!pool) {
      return;
    }

    const payment = pool.payments.find(
      (candidate) => candidate.participantId === participantId && candidate.month === month
    );

    if (payment) {
      payment.marked = true;
    } else {
      pool.payments.push({ participantId, month, marked: true, confirmed: false });
    }

    this.writeAll(pools);
  }

  /**
   * El organizador da por recibida la cuota de alguien. Da el pago también por
   * marcado: si él ha visto el ingreso, está pagado, lo dijera o no el
   * participante.
   */
  setPaymentConfirmed(poolId: string, participantId: string, month: string): void {
    const pools = this.readAll();
    const pool = pools.find((candidate) => candidate.poolId === poolId);
    if (!pool) {
      return;
    }

    const payment = pool.payments.find(
      (candidate) => candidate.participantId === participantId && candidate.month === month
    );

    if (payment) {
      payment.marked = true;
      payment.confirmed = true;
    } else {
      pool.payments.push({ participantId, month, marked: true, confirmed: true });
    }

    this.writeAll(pools);
  }

  /** Guarda el orden sorteado. Solo se hace una vez por porra. */
  saveDraw(poolId: string, turns: StoredTurn[], organizerParticipantId?: string): void {
    const pools = this.readAll();
    const pool = pools.find((candidate) => candidate.poolId === poolId);
    if (!pool) {
      return;
    }

    pool.turns = turns;
    if (organizerParticipantId) {
      pool.organizerParticipantId = organizerParticipantId;
    }
    this.writeAll(pools);
  }

  /** Lee el almacén completo, tolerando que esté vacío o corrupto. */
  private readAll(): StoredPool[] {
    try {
      const raw = sessionStorage.getItem(PoolsMockStore.STORAGE_KEY);
      const pools = raw ? (JSON.parse(raw) as StoredPool[]) : [];

      return pools.map((pool) => this.normalize(pool));
    } catch {
      return [];
    }
  }

  /**
   * Rellena las listas que falten. El modelo crece con cada incremento,
   * así que una porra guardada
   * antes reventaría al tocar un campo que aún no existía.
   */
  private normalize(pool: StoredPool): StoredPool {
    return {
      ...pool,
      participants: pool.participants ?? [],
      payments: pool.payments ?? [],
      turns: pool.turns ?? []
    };
  }

  /** Vuelca el almacén completo, ignorando fallos de cuota o modo privado. */
  private writeAll(pools: StoredPool[]): void {
    try {
      sessionStorage.setItem(PoolsMockStore.STORAGE_KEY, JSON.stringify(pools));
    } catch {
      // Sin almacenamiento el flujo se pierde al recargar, pero no rompe nada.
    }
  }
}
