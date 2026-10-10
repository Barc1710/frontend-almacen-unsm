import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** La bandera de cambio de clave es informativa hasta integrar Perfil. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return (
    auth.isAuthenticated() ||
    inject(Router).createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    })
  );
};

export const publicGuard: CanActivateFn = () => {
  return inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
};

/** El destino inicial también respeta permisos: dashboard puede no estar autorizado. */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureModules()
    .pipe(map(() => router.parseUrl(auth.isAuthenticated() ? auth.landingUrl() : '/auth/login')));
};

export function moduleGuard(code?: string): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const login = () =>
      router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    if (!auth.isAuthenticated()) return login();
    return auth.ensureModules().pipe(
      map((loaded) => {
        if (!auth.isAuthenticated()) return login();
        const hasAccess = code ? auth.canAccessModule(code) : auth.canAccessUrl(state.url);
        return (loaded && hasAccess) || router.createUrlTree(['/sin-acceso']);
      }),
    );
  };
}

/** Restringe el acceso exclusivamente al perfil ADMINISTRADOR */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return auth.isAdmin() ? true : router.createUrlTree(['/sin-acceso']);
};

