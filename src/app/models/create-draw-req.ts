/** Petición del sorteo del orden de cobro. */
export interface CreateDrawReq {
  /**
   * Si el organizador se reserva el turno 1. El resto de meses se reparte al
   * azar entre los demás.
   */
  readonly organizerFirst: boolean;

  /**
   * Cuál de los participantes es el organizador.
   */
  readonly organizerParticipantId?: string;
}
