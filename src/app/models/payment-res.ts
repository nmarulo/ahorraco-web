/** La cuota de un participante en un mes concreto. */
export interface PaymentRes {
  readonly participantId: string;

  /** Mes de la cuota, en formato `AAAA-MM`. */
  readonly month: string;

  /** El participante ha dicho que ya pagó. Ahorraco no mueve el dinero. */
  readonly marked: boolean;

  /** El organizador ha dado el pago por recibido. */
  readonly confirmed: boolean;
}
