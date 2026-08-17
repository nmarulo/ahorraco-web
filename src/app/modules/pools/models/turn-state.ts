/**
 * En qué punto está un turno respecto al mes en curso. Se deduce en el cliente
 * comparando el mes del turno con el `currentMonth` que manda la API, así que
 * no viaja en ningún DTO.
 */
export type TurnState = 'COLLECTED' | 'CURRENT' | 'PENDING';
