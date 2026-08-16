/**
 * Cómo se decide el código de gestión del organizador en el formulario de alta:
 * lo propone Ahorraco o lo escribe él. Es una elección de interfaz, no viaja a
 * la API — allí solo llega el código final (o ninguno, y lo genera el servidor).
 */
export type CodeMode = 'GENERATED' | 'CUSTOM';
