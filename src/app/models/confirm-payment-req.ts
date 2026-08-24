export interface ConfirmPaymentReq {
  readonly participantPublicId: string;

  /**
   * Mes de la cuota, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly month: string;
}
