import { TurnRes } from '@app/models/turn-res';

/** Orden de cobro completo de una porra. */
export interface GetOrderRes {
  /**
   * Mes en curso según el reloj del **servidor**, en formato `AAAA-MM`.
   *
   * Lo manda el backend a propósito, en vez de mirar la fecha del navegador:
   * así todo el grupo ve el mismo mes aunque alguien tenga mal la hora del
   * móvil. El cliente lo compara con el mes de cada turno para saber cuáles ya
   * se cobraron, cuál está en curso y cuáles quedan; si cae fuera del rango de
   * la porra, es que aún no ha empezado o que ya terminó.
   */
  readonly currentMonth: string;

  /** Vacío mientras no se haya hecho el sorteo. */
  readonly turns: TurnRes[];

  /**
   * Cuántas cuotas del mes en curso ha dado el organizador por recibidas.
   */
  readonly confirmedPayments: number;

  /**
   * Cuántas cuotas se esperan ese mes: todos los participantes menos quien
   * cobra, que no paga la suya. Va a cero si la porra no está en marcha.
   */
  readonly expectedPayments: number;
}
