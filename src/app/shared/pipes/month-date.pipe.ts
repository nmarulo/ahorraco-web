import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * Da formato a las fechas que manda la API, que llegan como cadena ISO
 * `AAAA-MM-DD` o `AAAA-MM` y no como `Date`.
 *
 * @example
 * ```html
 * {{ '2026-08-01' | monthDate: 'MMMM \'de\' y' }}
 * <!-- Salida: 'Agosto de 2026'-->
 *
 * {{ '2026-08-01' | monthDate: 'MMM y' }}
 * <!-- Salida: 'ago 2026'-->
 *
 * {{ '2026-08-01' | monthDate: 'MMMM' }}
 * <!-- Salida: 'Agosto'-->
 * ```
 */
@Pipe({ name: 'monthDate' })
export class MonthDatePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  /**
   * @param date Fecha ISO `AAAA-MM-DD`. También acepta `AAAA-MM`, y entonces
   *   se entiende el día 1.
   * @param format Cualquiera de los que admite `DatePipe`.
   */
  transform(date: string | null | undefined, format: string): string {
    const parsed = MonthDatePipe.parse(date);

    return parsed === null ? '' : formatDate(parsed, format, this.locale);
  }

  /**
   * Parseo manual, permitiendo que se envíe una cadena vacía, mal formada, o
   * que no tenga día.
   */
  private static parse(date: string | null | undefined): Date | null {
    if (!date) {
      return null;
    }

    const [year, month, day] = date.split('-').map(Number);

    if (!year || !month) {
      return null;
    }

    return new Date(year, month - 1, day || 1);
  }
}
