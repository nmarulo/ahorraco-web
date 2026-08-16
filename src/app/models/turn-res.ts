/** Un turno del orden de cobro: a quién le toca y en qué mes. */
export interface TurnRes {
  /** Posición en el orden, empezando en 1. */
  readonly position: number;

  readonly participantId: string;

  readonly fullName: string;

  /** Mes en que cobra, en formato `AAAA-MM`. */
  readonly month: string;

  /**
   * `true` si la posición se reservó en vez de sortearse, es decir, cuando el
   * organizador se fija a sí mismo como primero.
   */
  readonly pinned: boolean;
}
