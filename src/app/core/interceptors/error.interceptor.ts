import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional HTTP para la captura y tratamiento semántico
 * de respuestas con código de fallo emitidas por el backend.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401: {
          // 401 Unauthorized: Limpia el almacenamiento de sesión y redirige al login
          authService.clearSession();

          const currentUrl = router.url;
          if (!currentUrl.includes('/login')) {
            void router.navigate(['/login'], {
              queryParams: { returnUrl: currentUrl },
            });
          }
          break;
        }

        case 403: {
          // 403 Forbidden: Detecta falta de permisos o cuenta inactiva
          const rawMessage =
            typeof error.error === 'object' && error.error !== null
              ? (error.error.message ?? error.error.mensaje ?? '')
              : '';

          const isInactive =
            rawMessage.toLowerCase().includes('inactiv') ||
            rawMessage.toLowerCase().includes('deshabilitad');

          if (isInactive) {
            console.warn('[403 Forbidden] Cuenta inactiva detectada. Limpiando sesión.');
            authService.clearSession();
            void router.navigate(['/login'], {
              queryParams: { error: 'account_inactive' },
            });
          } else {
            console.warn(
              '[403 Forbidden] Acceso denegado:',
              rawMessage || 'El perfil no cuenta con permisos suficientes para este recurso.',
            );

            // Refrescar lista de módulos si la petición rechazada no es la de mis-módulos
            if (authService.isAuthenticated() && !req.url.includes('/auth/mis-modulos')) {
              authService.consultarMisModulos().subscribe({
                error: (err) => console.error('Error al sincronizar módulos tras 403:', err),
              });
            }
          }
          break;
        }

        case 409: {
          // 409 Conflict: Extrae el mensaje de negocio emitido por el backend (ej. stock insuficiente, registros duplicados)
          let businessMessage = 'Conflicto en la operación de negocio solicitada.';

          if (typeof error.error === 'object' && error.error !== null) {
            businessMessage = error.error.message ?? error.error.mensaje ?? businessMessage;
          } else if (typeof error.error === 'string' && error.error.trim().length > 0) {
            businessMessage = error.error;
          }

          console.warn('[409 Conflict] Mensaje de negocio:', businessMessage);
          break;
        }
      }

      return throwError(() => error);
    }),
  );
};
