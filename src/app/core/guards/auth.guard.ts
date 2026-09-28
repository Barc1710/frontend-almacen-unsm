import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardián funcional de ruta para la protección de vistas internas.
 * 1. Verifica si el usuario cuenta con una sesión autenticada activa (token presente).
 *    Si no está autenticado, lo redirige a '/login' preservando la URL original en 'returnUrl'.
 * 2. Si está autenticado pero tiene la bandera 'debeCambiarClave' en true,
 *    fuerza la redirección hacia la ruta obligatoria '/cambiar-clave' (excepto si ya se dirige a ella).
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificación de sesión activa
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // Verificación de cambio obligatorio de contraseña
  if (authService.debeCambiarClave()) {
    // Si la ruta solicitada ya es la de cambio de clave, permitir la navegación
    if (state.url.includes('/cambiar-clave')) {
      return true;
    }
    return router.createUrlTree(['/cambiar-clave']);
  }

  return true;
};

/**
 * Guardián funcional inverso para rutas de acceso público (ej. '/login').
 * Si el usuario ya se encuentra autenticado, evita mostrarle el login y
 * lo redirige al panel principal ('/dashboard') o a '/cambiar-clave' según corresponda.
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    if (authService.debeCambiarClave()) {
      return router.createUrlTree(['/cambiar-clave']);
    }
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

/**
 * Fábrica de guardián funcional para verificar permisos basados en el código de módulo autorizado.
 */
export function moduleGuard(codigoModuloRequerido: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    if (authService.isAdmin() || authService.hasModule(codigoModuloRequerido)) {
      return true;
    }

    console.warn(`[ModuleGuard] Acceso denegado al módulo requerido: ${codigoModuloRequerido}`);
    return router.createUrlTree(['/dashboard']);
  };
}
