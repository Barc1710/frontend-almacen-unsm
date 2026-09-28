import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, publicGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    debeCambiarClave: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      debeCambiarClave: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });

    router = TestBed.inject(Router);
  });

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const createDummyState = (url: string) => ({ url }) as RouterStateSnapshot;

  it('debe redirigir al login con returnUrl si el usuario no está autenticado', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, createDummyState('/articulos')),
    );

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.toString()).toContain('/auth/login');
    expect(urlTree.queryParams['returnUrl']).toBe('/articulos');
  });

  it('debe redirigir a /cambiar-clave si debeCambiarClave es true y se intenta acceder a otra ruta', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.debeCambiarClave.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, createDummyState('/dashboard')),
    );

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.toString()).toBe('/cambiar-clave');
  });

  it('debe permitir la navegación a /cambiar-clave cuando debeCambiarClave es true para evitar bucle', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.debeCambiarClave.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, createDummyState('/cambiar-clave')),
    );

    expect(result).toBe(true);
  });

  it('debe permitir la navegación normal si está autenticado y debeCambiarClave es false', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.debeCambiarClave.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, createDummyState('/articulos')),
    );

    expect(result).toBe(true);
  });
});

describe('publicGuard', () => {
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    debeCambiarClave: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      debeCambiarClave: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
  });

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/login' } as RouterStateSnapshot;

  it('debe permitir el acceso si el usuario no está autenticado', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => publicGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
  });

  it('debe redirigir a /dashboard si el usuario ya está autenticado', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.debeCambiarClave.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => publicGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });
});
