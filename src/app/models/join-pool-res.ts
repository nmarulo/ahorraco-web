/** Lo que recibe quien acaba de unirse a una porra. */
export interface JoinPoolRes {
  readonly participantId: string;

  /**
   * Token propio del participante. Es lo que le identifica en las siguientes
   * peticiones, ya que no hay usuarios ni contraseñas; se guarda en el cliente.
   */
  readonly participantToken: string;
}
