import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiResponse, JwtResponse, LoginRequest, ModuloResponse } from '../models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('debe inicializarse en estado no autenticado cuando el storage está vacío', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.modules()).toEqual([]);
    expect(service.debeCambiarClave()).toBe(false);
  });

  it('debe autenticar credenciales y actualizar signals al llamar a login con respuesta en español ({ exito, mensaje, datos })', () => {
    const loginPayload: LoginRequest = { usuario: 'admin', clave: 'secret123' };
    const mockJwt: JwtResponse = {
      token: 'jwt.token.xyz',
      usuario: 'admin',
      nombre: 'Administrador UNSM',
      perfil: 'ADMINISTRADOR',
      debeCambiarClave: true,
    };
    const mockResponse: ApiResponse<JwtResponse> = {
      exito: true,
      mensaje: 'Autenticación exitosa',
      datos: mockJwt,
    };

    service.login(loginPayload).subscribe((res) => {
      expect(res.datos?.token).toBe('jwt.token.xyz');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(loginPayload);
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt.token.xyz');
    expect(service.username()).toBe('admin');
    expect(service.isAdmin()).toBe(true);
    expect(service.debeCambiarClave()).toBe(true);
  });

  it('debe permitir cambiar la bandera debeCambiarClave mediante setDebeCambiarClave', () => {
    service.setDebeCambiarClave(true);
    expect(service.debeCambiarClave()).toBe(true);
    service.setDebeCambiarClave(false);
    expect(service.debeCambiarClave()).toBe(false);
  });

  it('debe consultar y almacenar los módulos de usuario', () => {
    const mockModulos: ModuloResponse[] = [
      {
        id: 1,
        codigo: 'ARTICULOS',
        nombre: 'Artículos',
        url: '/articulos',
        icono: 'boxes',
        orden: 1,
      },
      { id: 2, codigo: 'KARDEX', nombre: 'Kardex', url: '/kardex', icono: 'clipboard', orden: 2 },
    ];
    const mockResponse: ApiResponse<ModuloResponse[]> = {
      success: true,
      message: 'Módulos obtenidos',
      data: mockModulos,
    };

    service.consultarMisModulos().subscribe((res) => {
      expect(res.datos?.length).toBe(2);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/mis-modulos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(service.modules().length).toBe(2);
    expect(service.hasModule('ARTICULOS')).toBe(true);
    expect(service.hasModule('kardex')).toBe(true);
    expect(service.hasModule('EGRESOS')).toBe(false);
  });

  it('debe limpiar el estado de sesión y almacenamiento al hacer logout', () => {
    service.clearSession();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.modules()).toEqual([]);
  });
  it.each(['ADMINISTRADOR', 'USUARIO'])('usa módulos reales para el perfil %s', (perfil) => {
    service.login({ usuario: 'persona', clave: 'clave' }).subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({
      datos: { token: 'real-token', usuario: 'persona', nombre: 'Persona', perfil },
    });
    service.consultarMisModulos().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/auth/mis-modulos`).flush({
      datos: [
        {
          id: 2,
          codigo: 'KARDEX',
          nombre: 'Mi kardex',
          url: '//external.example',
          icono: null,
          orden: 2,
        },
        {
          id: 1,
          codigo: 'ARTICULOS',
          nombre: 'Mis artículos',
          url: '/modulo/articulos',
          icono: null,
          orden: 1,
        },
      ],
    });
    expect(service.navigationModules().map((module) => module.codigo)).toEqual([
      'ARTICULOS',
      'KARDEX',
    ]);
    expect(service.landingUrl()).toBe('/dashboard');
    expect(service.canAccessModule('DASHBOARD')).toBe(true);
    expect(service.canAccessModule('USUARIOS')).toBe(perfil === 'ADMINISTRADOR');
  });

  it('rechaza login sin token en vez de emitir éxito', () => {
    const error = vi.fn();
    service.login({ usuario: 'u', clave: 'p' }).subscribe({ error });
    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({ datos: { usuario: 'u' } });
    expect(error).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rechaza respuestas marcadas como fallidas aunque contengan token', () => {
    const error = vi.fn();
    service.login({ usuario: 'u', clave: 'p' }).subscribe({ error });
    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({
      exito: false,
      datos: {
        token: 'token',
        usuario: 'u',
        nombre: 'Usuario',
        perfil: 'ADMINISTRADOR',
      },
    });
    expect(error).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('descarta permisos de una petición que termina después del logout', () => {
    service.login({ usuario: 'u', clave: 'p' }).subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({
      datos: {
        token: 'token',
        usuario: 'u',
        nombre: 'Usuario',
        perfil: 'USUARIO',
      },
    });
    service.consultarMisModulos().subscribe();
    const pending = httpTesting.expectOne(`${environment.apiUrl}/auth/mis-modulos`);
    service.clearSession();
    pending.flush({
      datos: [
        {
          id: 1,
          codigo: 'ARTICULOS',
          nombre: 'Artículos',
          url: '/articulos',
          icono: null,
          orden: 1,
        },
      ],
    });
    expect(service.modules()).toEqual([]);
    expect(service.modulesLoaded()).toBe(false);
  });
});
