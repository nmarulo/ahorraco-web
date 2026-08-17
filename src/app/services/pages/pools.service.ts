import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { CreateDrawReq } from '@app/models/create-draw-req';
import { CreatePoolReq } from '@app/models/create-pool-req';
import { CreatePoolRes } from '@app/models/create-pool-res';
import { GetOrderRes } from '@app/models/get-order-res';
import { GetPoolInvitationRes } from '@app/models/get-pool-invitation-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { JoinPoolReq } from '@app/models/join-pool-req';
import { JoinPoolRes } from '@app/models/join-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { PaymentRes } from '@app/models/payment-res';
import { TurnRes } from '@app/models/turn-res';
import { PoolsMockStore, StoredPool, StoredTurn } from '@app/shared/mock/pools-mock-store';

/**
 * Cliente del recurso `pools` de la API REST.
 *
 * Mientras `ahorraco-api` no exista, los métodos devuelven datos simulados con
 * un retardo pequeño para que la interfaz se comporte como con red de verdad
 * (estados de «enviando», botones deshabilitados…). Cada punto a sustituir
 * está marcado con un TODO, y los datos salen de `PoolsMockStore`, que hace de
 * base de datos de mentira.
 */
@Injectable({ providedIn: 'root' })
export class PoolsService {
  /** Retardo que imita la latencia de red mientras no hay API. */
  private static readonly SIMULATED_DELAY_MS = 600;

  /** Longitud del sufijo aleatorio del código de gestión. */
  private static readonly SUFFIX_LENGTH = 4;

  /** Longitud del token del enlace de invitación. */
  private static readonly INVITATION_TOKEN_LENGTH = 10;

  /** Sin `I`, `L`, `O`, `0` ni `1`: se confunden al dictarlos por WhatsApp. */
  private static readonly CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  /** Iniciales que se usan cuando la porra todavía no tiene nombre. */
  private static readonly DEFAULT_INITIALS = 'PORRA';

  /** Número máximo de iniciales que se toman del nombre de la porra. */
  private static readonly MAX_INITIALS = 4;

  private readonly store = inject(PoolsMockStore);

  /**
   * Da de alta una porra y devuelve su identificador, el código de gestión del
   * organizador y el token del enlace de invitación.
   */
  createPool(request: CreatePoolReq): Observable<CreatePoolRes> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.post<CreatePoolRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools`, request);
    const pool: StoredPool = {
      poolId: crypto.randomUUID(),
      managementCode: request.managementCode?.trim() || this.composeManagementCode(request.name),
      invitationToken: this.randomString(PoolsService.INVITATION_TOKEN_LENGTH).toLowerCase(),
      name: request.name,
      monthlyFee: request.monthlyFee,
      numParticipants: request.numParticipants,
      startDate: request.startDate,
      paymentDueDay: request.paymentDueDay,
      ...(request.notes ? { notes: request.notes } : {}),
      participants: [],
      payments: [],
      turns: []
    };
    this.store.savePool(pool);

    return this.simulate({
      poolId: pool.poolId,
      managementCode: pool.managementCode,
      invitationToken: pool.invitationToken
    });
  }

  /**
   * Devuelve la porra con los datos que solo debe ver su organizador.
   *
   * OJO: `ahorraco-api/docs/api-endpoints.md` todavía no recoge este endpoint;
   * la pantalla de invitar lo necesita para pintar el enlace y el código.
   */
  getPool(poolId: string): Observable<GetPoolRes> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.get<GetPoolRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}`);
    const pool = this.store.findById(poolId);
    if (!pool) {
      return this.simulateNotFound('No existe ninguna porra con ese identificador.');
    }

    return this.simulate({
      poolId: pool.poolId,
      name: pool.name,
      monthlyFee: pool.monthlyFee,
      numParticipants: pool.numParticipants,
      startDate: pool.startDate,
      paymentDueDay: pool.paymentDueDay,
      ...(pool.notes ? { notes: pool.notes } : {}),
      managementCode: pool.managementCode,
      invitationToken: pool.invitationToken
    });
  }

  /**
   * Resuelve un enlace de invitación: lo que ve alguien de fuera antes de
   * unirse, sin código de gestión ni datos del resto de participantes.
   *
   * OJO: tampoco está en `api-endpoints.md`. Hace falta porque el invitado solo
   * tiene el token del enlace, no el `poolId`.
   */
  getPoolByInvitation(invitationToken: string): Observable<GetPoolInvitationRes> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.get<GetPoolInvitationRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/by-invitation/${invitationToken}`);
    const pool = this.store.findByInvitationToken(invitationToken);
    if (!pool) {
      return this.simulateNotFound('Este enlace de invitación no vale o ya no existe.');
    }

    return this.simulate({
      poolId: pool.poolId,
      name: pool.name,
      monthlyFee: pool.monthlyFee,
      numParticipants: pool.numParticipants,
      startDate: pool.startDate,
      joinedCount: pool.participants.length
    });
  }

  /** Quién se ha unido ya a la porra. */
  getParticipants(poolId: string): Observable<ParticipantRes[]> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.get<ParticipantRes[]>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/participants`);
    const pool = this.store.findById(poolId);

    return this.simulate((pool?.participants ?? []).map((person) => this.toParticipantRes(person)));
  }

  /** Une a alguien a la porra a partir del token de su enlace de invitación. */
  joinPool(invitationToken: string, request: JoinPoolReq): Observable<JoinPoolRes> {
    // TODO: reemplazar con llamada real a la API — el `invitationToken` viajará
    // como credencial, no como parte de la ruta:
    //   return this.http.post<JoinPoolRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/participants`, request);
    const pool = this.store.findByInvitationToken(invitationToken);
    if (!pool) {
      return this.simulateNotFound('Este enlace de invitación no vale o ya no existe.');
    }

    if (pool.participants.length >= pool.numParticipants) {
      return this.simulateNotFound('Esta porra ya está completa.');
    }

    const phone = request.phone?.trim();
    const participant = {
      participantId: crypto.randomUUID(),
      participantToken: crypto.randomUUID(),
      fullName: request.fullName.trim(),
      ...(phone ? { phone } : {})
    };
    this.store.addParticipant(pool.poolId, participant);

    return this.simulate({
      participantId: participant.participantId,
      participantToken: participant.participantToken
    });
  }

  /**
   * Orden de cobro, con el mes en curso según el reloj del servidor. La lista
   * de turnos va vacía si todavía no se ha hecho el sorteo.
   *
   * Es el endpoint de I-04; I-03 lo usa además para saber si el sorteo ya está
   * hecho y no dejar repetirlo.
   */
  getOrder(poolId: string): Observable<GetOrderRes> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.get<GetOrderRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/order`);
    const pool = this.store.findById(poolId);
    if (!pool) {
      return this.simulateNotFound('No existe ninguna porra con ese identificador.');
    }

    return this.simulate({
      // El mes lo pone el servidor; aquí lo suple el reloj del navegador.
      currentMonth: this.currentMonth(),
      turns: this.toTurnsRes(pool)
    });
  }

  /**
   * Sortea el orden de cobro entre quienes ya se han unido.
   *
   * Es irreversible a propósito: hay dinero real de por medio y el orden tiene
   * que ser fiable. Si ya se sorteó, falla en vez de rehacerlo.
   */
  createDraw(poolId: string, request: CreateDrawReq): Observable<TurnRes[]> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.post<TurnRes[]>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/draw`, request);
    const pool = this.store.findById(poolId);
    if (!pool) {
      return this.simulateNotFound('No existe ninguna porra con ese identificador.');
    }

    if (pool.turns.length > 0) {
      return this.simulateNotFound('El sorteo de esta porra ya está hecho.');
    }

    if (pool.participants.length < pool.numParticipants) {
      return this.simulateNotFound('Todavía falta gente por unirse.');
    }

    const turns = this.buildTurns(pool, request);
    this.store.saveDraw(poolId, turns, request.organizerParticipantId);

    return this.simulate(this.toTurnsRes({ ...pool, turns }));
  }

  /**
   * Las cuotas de un participante en toda la porra.
   *
   * OJO: `api-endpoints.md` solo define el listado del organizador
   * (`GET /pools/{poolId}/payments?month=…`), que enseña a todo el grupo. Esto
   * es la vista propia de cada uno, y falta recogerla allí.
   */
  getMyPayments(poolId: string, participantId: string): Observable<PaymentRes[]> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.get<PaymentRes[]>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/payments/mine`);
    const pool = this.store.findById(poolId);
    if (!pool) {
      return this.simulateNotFound('No existe ninguna porra con ese identificador.');
    }

    return this.simulate(
      pool.payments.filter((payment) => payment.participantId === participantId).map((payment) => ({ ...payment }))
    );
  }

  /**
   * El participante dice que ya ha pagado su cuota del mes.
   *
   * No mueve dinero: solo deja constancia para que el organizador busque el
   * ingreso y lo confirme.
   */
  markPaid(poolId: string, month: string, participantId: string): Observable<PaymentRes> {
    // TODO: reemplazar con llamada real a la API — el participante irá
    // identificado por su `participantToken`, no por `participantId` en el
    // cuerpo (ver `CLAUDE.md` §12):
    //   return this.http.post<PaymentRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools/${poolId}/payments/${month}/mark-paid`, {});
    const pool = this.store.findById(poolId);
    if (!pool) {
      return this.simulateNotFound('No existe ninguna porra con ese identificador.');
    }

    this.store.setPaymentMarked(poolId, participantId, month, true);

    return this.simulate({ participantId, month, marked: true, confirmed: false });
  }

  /**
   * Compone el código de gestión que se le propone al organizador: las
   * iniciales del nombre de la porra más un sufijo aleatorio.
   *
   * El sufijo se pasa desde fuera para que no cambie en cada pulsación mientras
   * se escribe el nombre; se renueva solo cuando el organizador lo pide.
   */
  composeManagementCode(name: string, suffix = this.generateSuffix()): string {
    const initials = name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .filter((letter) => /\p{L}|\p{N}/u.test(letter))
      .join('')
      .toUpperCase()
      .slice(0, PoolsService.MAX_INITIALS);

    return `${initials || PoolsService.DEFAULT_INITIALS}-${suffix}`;
  }

  /** Genera el sufijo aleatorio del código de gestión. */
  generateSuffix(): string {
    // TODO: reemplazar con llamada real a la API — el código definitivo lo
    // genera el servidor al crear la porra; esto es solo la sugerencia visible
    // en el formulario.
    return this.randomString(PoolsService.SUFFIX_LENGTH);
  }

  /** Pasa un participante del almacén al DTO, sin filtrar nada de más. */
  private toParticipantRes(participant: { participantId: string; fullName: string; phone?: string }): ParticipantRes {
    return {
      participantId: participant.participantId,
      fullName: participant.fullName,
      ...(participant.phone ? { phone: participant.phone } : {})
    };
  }

  /**
   * Reparte los meses entre los participantes.
   *
   * Si el organizador se fija como primero, su turno sale del sorteo y solo se
   * revuelve el resto.
   */
  private buildTurns(pool: StoredPool, request: CreateDrawReq): StoredTurn[] {
    const pinnedId = request.organizerFirst ? request.organizerParticipantId : undefined;
    const pinned = pool.participants.filter((person) => person.participantId === pinnedId);
    const rest = this.shuffle(
      pool.participants.filter((person) => person.participantId !== pinnedId)
    );

    return [...pinned, ...rest].map((person, index) => ({
      position: index + 1,
      participantId: person.participantId,
      month: this.addMonths(pool.startDate, index),
      pinned: person.participantId === pinnedId
    }));
  }

  /** Pasa los turnos guardados al DTO, resolviendo el nombre de cada uno. */
  private toTurnsRes(pool: StoredPool): TurnRes[] {
    return pool.turns.map((turn) => ({
      position: turn.position,
      participantId: turn.participantId,
      fullName:
        pool.participants.find((person) => person.participantId === turn.participantId)?.fullName ??
        '',
      month: turn.month,
      pinned: turn.pinned
    }));
  }

  /** Baraja Fisher-Yates, sin repetir a nadie. */
  private shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    const random = crypto.getRandomValues(new Uint32Array(result.length));

    for (let index = result.length - 1; index > 0; index--) {
      const target = random[index] % (index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }

    return result;
  }

  /** Suma meses a un `AAAA-MM` y devuelve otro `AAAA-MM`. */
  private addMonths(startDate: string, offset: number): string {
    const [year, month] = startDate.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Mes de hoy en `AAAA-MM`. En la API real lo pone el reloj del servidor. */
  private currentMonth(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Envuelve una respuesta simulada con la latencia de red de mentira. */
  private simulate<T>(response: T): Observable<T> {
    return of(response).pipe(delay(PoolsService.SIMULATED_DELAY_MS));
  }

  /** Error simulado, en el sitio donde la API devolvería un 404. */
  private simulateNotFound<T>(message: string): Observable<T> {
    return throwError(() => new Error(message)).pipe(delay(PoolsService.SIMULATED_DELAY_MS));
  }

  /** Cadena aleatoria del alfabeto legible, de la longitud pedida. */
  private randomString(length: number): string {
    const alphabet = PoolsService.CODE_ALPHABET;
    const bytes = crypto.getRandomValues(new Uint8Array(length));

    return Array.from(bytes, (byte) => alphabet.charAt(byte % alphabet.length)).join('');
  }
}
