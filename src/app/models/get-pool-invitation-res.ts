export interface GetPoolInvitationRes {
  readonly publicId: string;

  readonly name: string;

  readonly monthlyFee: number;

  readonly numParticipants: number;

  /**
   * Mes de inicio, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly startDate: string;

  /**
   * Día del pago de la cuota.
   */
  readonly paymentDueDay: number;

  readonly joinedCount: number;
}
