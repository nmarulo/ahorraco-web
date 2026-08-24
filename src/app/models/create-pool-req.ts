export interface CreatePoolReq {
  readonly name: string;

  readonly monthlyFee: number;

  readonly numParticipants: number;

  /**
   * Mes de inicio, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly startDate: string;

  readonly paymentDueDay: number;

  readonly notes?: string;

  readonly managementCode?: string;
}
