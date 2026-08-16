/** Lo que devuelve el alta de una porra. */
export interface CreatePoolRes {
  /** Identificador de la porra; es lo que va en la URL del grupo. */
  readonly poolId: string;

  /**
   * Clave que identifica al organizador cuando abre la URL del grupo. No hay
   * usuarios ni contraseñas: esto es lo único que le acredita como tal.
   */
  readonly managementCode: string;

  /** Token del enlace de invitación con el que se unen los participantes. */
  readonly invitationToken: string;
}
