/**
 * Los trozos del recordatorio del mes, ya redactados.
 *
 * El servidor los redacta **todos**; el cliente decide cuáles pega según lo que
 * el organizador active en los interruptores. Así se puede cambiar la selección
 * sin volver a pedir nada, y la redacción vive en un solo sitio — el mismo que
 * usará el envío automático.
 */
export interface GetReminderRes {
  /** Mes del que avisa, en formato `AAAA-MM`. */
  readonly month: string;

  /** Saludo con el mes y el nombre de la porra. Va siempre. */
  readonly greeting: string;

  /** Quién cobra este mes, su turno y la cuota. Ausente si el mes no tiene turno. */
  readonly beneficiary?: string;

  /** Quién falta por pagar y a quién le falta la confirmación. */
  readonly debtors: string;

  /** Enlace para que cada uno marque su pago. */
  readonly link: string;

  /** La nota que dejó el organizador al crear la porra, si la puso. */
  readonly paymentDetails?: string;
}
