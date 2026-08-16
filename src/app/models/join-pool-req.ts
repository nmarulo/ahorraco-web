/** Datos con los que un invitado se une a una porra desde el enlace. */
export interface JoinPoolReq {
  /** Nombre completo: es como le reconocerá el resto del grupo. */
  readonly fullName: string;

  /**
   * Teléfono. **Opcional a propósito**: le sirve al organizador para localizar
   * a quien falta por pagar, pero no se exige para entrar.
   */
  readonly phone?: string;
}
