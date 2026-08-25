import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { OrganizerSession } from '@app/services/session/organizer-session.service';

/** La cabecera con la que la API identifica al organizador. */
export const MANAGEMENT_CODE_HEADER = 'X-Management-Code';

/** `/pools/<uuid>` en cualquier punto de la ruta. */
const POOL_ID_PATTERN =
  /\/pools\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * Añade la cabecera `X-Management-Code` a las peticiones que consultan datos de la porra.
 *
 * Actualmente, afecta a: el sorteo, la confirmación de pagos, el listado del mes, el recordatorio
 * y la propia porra.
 *
 * **Si la petición ya trae la cabecera puesta, no se toca.** Es lo que permite a la pantalla de
 * acceso del organizador probar un código que todavía no está guardado en la sesión.
 */
export const managementCodeInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has(MANAGEMENT_CODE_HEADER)) {
    return next(request);
  }

  const poolId = POOL_ID_PATTERN.exec(request.url)?.[1];
  if (!poolId) {
    return next(request);
  }

  const managementCode = inject(OrganizerSession).get(poolId);
  if (!managementCode) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { [MANAGEMENT_CODE_HEADER]: managementCode } }));
};
