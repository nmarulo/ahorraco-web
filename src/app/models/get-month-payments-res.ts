export interface MonthPaymentRes {
  readonly participantPublicId: string;

  readonly fullName: string;

  /**
   * Indica que el participante ha marcado que ya ha pagado.
   */
  readonly marked: boolean;

  /**
   * Indica que el organizador ha dado por recibido el pago.
   */
  readonly confirmed: boolean;
}

export interface GetMonthPaymentsRes {
  /**
   * Mes, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly month: string;

  readonly payments: MonthPaymentRes[];
}
