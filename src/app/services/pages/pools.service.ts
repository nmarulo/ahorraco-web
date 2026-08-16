import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { CreatePoolReq } from '@app/models/create-pool-req';
import { CreatePoolRes } from '@app/models/create-pool-res';
import { GetPoolInvitationRes } from '@app/models/get-pool-invitation-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { JoinPoolReq } from '@app/models/join-pool-req';
import { JoinPoolRes } from '@app/models/join-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { PoolsMockStore, StoredPool } from '@app/shared/mock/pools-mock-store';

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
      participants: []
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
