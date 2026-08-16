/**
 * Configuración de desarrollo. La sustituye el `fileReplacements` de la
 * configuración `development` de `angular.json` (la que usa `pnpm start`).
 *
 * Apunta a `ahorraco-api` levantado en local; mientras la API no exista, las
 * pantallas trabajan con datos de prueba y esta URL no se usa.
 */
export const environment = {
  production: false,
  AHORRACO_REST_API_URL: 'http://localhost:8080/api'
};
