import { TurnRes } from '@app/models/turn-res';

export interface GetOrderRes {
  /**
   * Mes de la cuota, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly currentMonth: string;

  /**
   * Indica las cuotas del mes confirmadas por el organizador.
   */
  readonly confirmedPayments: number;

  /**
   * Indica las cuotas del mes esperadas.
   */
  readonly expectedPayments: number;

  /**
   * Orden sorteado de los participantes.
   *
   * NOTA: Vacío mientras no se haya hecho el sorteo.
   */
  readonly turns: TurnRes[];
}
