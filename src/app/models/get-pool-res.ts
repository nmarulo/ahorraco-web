export interface GetPoolRes {
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

  readonly notes?: string;

  readonly joinedCount: number;

  readonly managementCode?: string;

  readonly invitationToken?: string;
}
