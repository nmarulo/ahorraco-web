/**
 * Momento del mes en que vence la cuota. Se guarda como código y no como
 * número para que «el último día» quepa en el mismo campo.
 */
export type PaymentDueDay = 'DAY_5' | 'DAY_10' | 'DAY_15' | 'LAST_DAY';

/** Datos que el organizador envía para dar de alta una porra. */
export interface CreatePoolReq {
  /** Nombre con el que verán la porra todos los participantes. */
  readonly name: string;

  /** Cuota mensual en euros, la misma para todos los participantes. */
  readonly monthlyFee: number;

  /**
   * Número de participantes. Como cada uno cobra un mes, también fija la
   * duración de la porra en meses.
   */
  readonly numParticipants: number;

  /**
   * Mes de inicio en formato `AAAA-MM`, tal cual lo da un
   * `<input type="month">`. No lleva día porque la porra arranca por meses.
   */
  readonly startDate: string;

  readonly paymentDueDay: PaymentDueDay;

  /** Nota libre para el grupo (por ejemplo, cómo se paga). */
  readonly notes?: string;

  /**
   * Código de gestión elegido por el organizador. Si no se envía, lo genera
   * el servidor y llega en la respuesta.
   */
  readonly managementCode?: string;
}
