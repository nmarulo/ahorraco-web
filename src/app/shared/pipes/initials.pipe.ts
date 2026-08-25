import { Pipe, PipeTransform } from '@angular/core';

/**
 * Obtiene las iniciales de dos palabras.
 *
 * @example
 * ```html
 * {{ 'Ana López Ruiz' | initials }}
 * <!-- Salida: 'AL'-->
 * ```
 */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  private static readonly MAX_WORDS = 2;

  transform(fullName: string | null | undefined): string {
    if (!fullName) {
      return '';
    }

    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, InitialsPipe.MAX_WORDS)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }
}
