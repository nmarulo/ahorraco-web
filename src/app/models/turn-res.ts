export interface TurnRes {
  /**
   * Posición en el orden de cobro del participante.
   */
  readonly position: number;

  readonly participantPublicId: string;

  readonly fullName: string;

  /**
   * Mes de la cuota, en formato ISO `AAAA-MM-DD`. El dia es indiferente.
   */
  readonly month: string;

  /**
   * Establece que la posición se reservó en vez de sortearse.
   */
  readonly pinned: boolean;
}
