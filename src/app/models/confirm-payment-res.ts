export interface ConfirmPaymentRes {
  readonly participantPublicId: string;

  /**
   * Mes de la cuota, en formato ISO `AAAA-MM-DD`.
   */
  readonly month: string;

  readonly marked: boolean;

  readonly confirmed: boolean;
}
