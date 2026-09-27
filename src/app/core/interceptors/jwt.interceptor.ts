import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional HTTP que inyecta la cabecera 'Authorization: Bearer <token>'
 * en las peticiones salientes dirigidas a la API REST base, ignorando rutas públicas
 * como el endpoint de inicio de sesión.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  // Excluir la petición de autenticación pública
  const isLoginEndpoint = req.url.includes('/auth/login');

  // Validar si la petición se dirige al contexto base del backend
  const isTargetApi =
    req.url.startsWith(environment.apiUrl) ||
    req.url.startsWith('/api/v1') ||
    (!req.url.startsWith('http') && !req.url.startsWith('assets/'));

  if (token && isTargetApi && !isLoginEndpoint) {
    const authenticatedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authenticatedRequest);
  }

  return next(req);
};
