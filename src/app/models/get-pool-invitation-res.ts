/**
 * Lo que ve quien abre un enlace de invitación **antes** de unirse.
 *
 * Solo lleva lo justo para decidir si entra: ni el código de gestión, ni los
 * teléfonos de los demás, ni nada que no deba ver alguien de fuera todavía.
 */
export interface GetPoolInvitationRes {
  readonly poolId: string;

  readonly name: string;

  readonly monthlyFee: number;

  readonly numParticipants: number;

  /** Mes de inicio en formato `AAAA-MM`. */
  readonly startDate: string;

  /** Cuántas personas hay ya dentro, para saber si queda sitio. */
  readonly joinedCount: number;
}
