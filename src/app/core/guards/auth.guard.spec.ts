import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard, landingGuard, moduleGuard, publicGuard } from './auth.guard';

describe('Guards de sesión y permisos', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;
  const auth = {
    isAuthenticated: vi.fn(),
    debeCambiarClave: vi.fn(),
    ensureModules: vi.fn(),
    canAccessModule: vi.fn(),
    landingUrl: vi.fn(),
  };

  beforeEach(() => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.debeCambiarClave.mockReturnValue(true);
    auth.ensureModules.mockReturnValue(of(true));
    auth.canAccessModule.mockReset().mockReturnValue(false);
    auth.landingUrl.mockReturnValue('/articulos');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('redirige a la ruta oficial de login preservando el destino', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, state('/articulos')),
    ) as UrlTree;
    expect(result.toString()).toBe('/auth/login?returnUrl=%2Farticulos');
  });

  it.each(['/dashboard', '/articulos', '/dashboard#/cambiar-clave'])(
    'no fuerza un cambio de clave pendiente al visitar %s',
    (url) => {
      expect(TestBed.runInInjectionContext(() => authGuard(route, state(url)))).toBe(true);
    },
  );

  it('deja entrar al login sin sesión', () => {
    auth.isAuthenticated.mockReturnValue(false);
    expect(TestBed.runInInjectionContext(() => publicGuard(route, state('/auth/login')))).toBe(
      true,
    );
  });

  it('envía las sesiones existentes al selector de destino autorizado', () => {
    const result = TestBed.runInInjectionContext(() =>
      publicGuard(route, state('/auth/login')),
    ) as UrlTree;
    expect(result.toString()).toBe('/');
  });

  it('elige un módulo permitido aunque dashboard no esté asignado', async () => {
    const result = TestBed.runInInjectionContext(() => landingGuard(route, state('/')));
    const resolved = isObservable(result) ? await firstValueFrom(result) : await result;
    expect((resolved as UrlTree).toString()).toBe('/articulos');
  });

  it.each([true, false])('aplica permisos con acceso=%s', async (allowed) => {
    auth.canAccessModule.mockReturnValue(allowed);
    const result = TestBed.runInInjectionContext(() =>
      moduleGuard('ARTICULOS')(route, state('/articulos')),
    );
    const resolved = isObservable(result) ? await firstValueFrom(result) : await result;
    expect(auth.canAccessModule).toHaveBeenCalledWith('ARTICULOS');
    if (allowed) expect(resolved).toBe(true);
    else expect((resolved as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('deniega la ruta cuando no pueden cargarse permisos', async () => {
    auth.ensureModules.mockReturnValue(of(false));
    auth.canAccessModule.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      moduleGuard('ARTICULOS')(route, state('/articulos')),
    );
    const resolved = isObservable(result) ? await firstValueFrom(result) : await result;
    expect((resolved as UrlTree).toString()).toBe('/sin-acceso');
  });
});
