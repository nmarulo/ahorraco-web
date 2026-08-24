export interface MyPaymentRes {
  /**
   * Mes de la cuota, en formato ISO `AAAA-MM-DD`.
   */
  readonly month: string;

  /**
   * Indica que el participante ha marcado que ya ha pagado.
   */
  readonly marked: boolean;

  /**
   * El organizador ha dado por recibido el pago.
   */
  readonly confirmed: boolean;
}

export interface GetMyPaymentsRes {
  readonly payments: MyPaymentRes[];
}
