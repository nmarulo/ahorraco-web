import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { CreatePoolReq } from '@app/models/create-pool-req';
import { CreatePoolRes } from '@app/models/create-pool-res';

/**
 * Cliente del recurso `pools` de la API REST.
 *
 * Mientras `ahorraco-api` no exista, los métodos devuelven datos simulados con
 * un retardo pequeño para que la interfaz se comporte como con red de verdad
 * (estados de «enviando», botones deshabilitados…). Cada punto a sustituir
 * está marcado con un TODO.
 */
@Injectable({ providedIn: 'root' })
export class PoolsService {
  /** Retardo que imita la latencia de red mientras no hay API. */
  private static readonly SIMULATED_DELAY_MS = 600;

  /** Longitud del sufijo aleatorio del código de gestión. */
  private static readonly SUFFIX_LENGTH = 4;

  /** Sin `I`, `L`, `O`, `0` ni `1`: se confunden al dictarlos por WhatsApp. */
  private static readonly CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  /** Iniciales que se usan cuando la porra todavía no tiene nombre. */
  private static readonly DEFAULT_INITIALS = 'PORRA';

  /** Número máximo de iniciales que se toman del nombre de la porra. */
  private static readonly MAX_INITIALS = 4;

  /**
   * Da de alta una porra y devuelve su identificador, el código de gestión del
   * organizador y el token del enlace de invitación.
   */
  createPool(request: CreatePoolReq): Observable<CreatePoolRes> {
    // TODO: reemplazar con llamada real a la API
    //   return this.http.post<CreatePoolRes>(
    //     `${environment.AHORRACO_REST_API_URL}/pools`, request);
    const response: CreatePoolRes = {
      poolId: this.generateToken(),
      managementCode: request.managementCode?.trim() || this.composeManagementCode(request.name),
      invitationToken: this.generateToken()
    };

    return of(response).pipe(delay(PoolsService.SIMULATED_DELAY_MS));
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

  /** Identificador opaco simulado (el real lo asigna la API). */
  private generateToken(): string {
    // TODO: reemplazar con llamada real a la API
    return crypto.randomUUID();
  }

  /** Cadena aleatoria del alfabeto legible, de la longitud pedida. */
  private randomString(length: number): string {
    const alphabet = PoolsService.CODE_ALPHABET;
    const bytes = crypto.getRandomValues(new Uint8Array(length));

    return Array.from(bytes, (byte) => alphabet.charAt(byte % alphabet.length)).join('');
  }
}
