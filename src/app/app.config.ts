import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import localeEs from '@angular/common/locales/es';

import { routes } from './app.routes';
import { apiErrorInterceptor } from '@app/shared/interceptor/api-error.interceptor';
import { managementCodeInterceptor } from '@app/shared/interceptor/management-code.interceptor';

// La interfaz está en español: sin esto, los pipes de número y fecha
// formatearían al estilo inglés (1,000.5 en vez de 1.000,5).
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([managementCodeInterceptor, apiErrorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ]
};
