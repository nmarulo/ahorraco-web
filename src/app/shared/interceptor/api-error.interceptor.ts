import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const NO_RESPONSE_MESSAGE =
  'Ha ocurrido un problema por nuestra parte. Por favor, inténtelo de nuevo en 5 minutos.';

const FALLBACK_MESSAGE = 'Algo ha ido mal. Inténtalo de nuevo.';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((response: HttpErrorResponse) => throwError(() => new Error(messageOf(response))))
  );

/**
 * Obtiene la descripción del error que se mostrará al usuario.
 * El mensaje se obtiene del objeto "ErrorRes" de la API.
 */
function messageOf(response: HttpErrorResponse): string {
  // En caso de fallo de red, el servidor no responde.
  if (response.status === 0) {
    return NO_RESPONSE_MESSAGE;
  }

  const detail = (response.error as { error?: { detail?: string } } | null)?.error?.detail;

  return detail?.trim() || FALLBACK_MESSAGE;
}
