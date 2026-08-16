/**
 * Configuración de producción.
 *
 * Al añadir una clave nueva hay que declararla también en
 * `environment.development.ts`, o el build de desarrollo dejará de compilar.
 */
export const environment = {
  production: true,
  AHORRACO_REST_API_URL: 'https://ahorraco-api.nmarulo.dev/api'
};
