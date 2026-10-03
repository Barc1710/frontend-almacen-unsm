import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { getApiPath } from '../http/api-url';

/**
 * Interceptor funcional HTTP que inyecta la cabecera 'Authorization: Bearer <token>'
 * en las peticiones salientes dirigidas a la API REST base, ignorando rutas públicas
 * como el endpoint de inicio de sesión.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  const apiPath = getApiPath(req.url, environment.apiUrl, inject(DOCUMENT).baseURI);

  if (token && apiPath !== null && apiPath !== '/auth/login') {
    const authenticatedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
      redirect: 'error',
    });
    return next(authenticatedRequest);
  }

  return next(req);
};
