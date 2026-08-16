/** Un participante ya dentro de la porra, tal y como lo devuelve la API. */
export interface ParticipantRes {
  readonly participantId: string;

  readonly fullName: string;

  /** Ausente si la persona se unió sin dejar teléfono. */
  readonly phone?: string;
}
