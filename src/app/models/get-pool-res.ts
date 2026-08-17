/**
 * La porra vista por su organizador.
 *
 * Incluye el código de gestión y el token de invitación, así que solo debe
 * devolverse a quien se identifique con el `managementCode`.
 */
export interface GetPoolRes {
  readonly poolId: string;

  readonly name: string;

  readonly monthlyFee: number;

  readonly numParticipants: number;

  /** Mes de inicio en formato `AAAA-MM`. */
  readonly startDate: string;

  /** Cuándo vence la cuota cada mes; el mismo código que en el alta. */
  readonly paymentDueDay: string;

  /** Nota que dejó el organizador para el grupo, si la puso. */
  readonly notes?: string;

  readonly managementCode: string;

  /** Token que forma el enlace de invitación que reparte el organizador. */
  readonly invitationToken: string;
}
