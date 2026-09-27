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

  it('debe autenticar credenciales y actualizar signals al llamar a login', () => {
    const loginPayload: LoginRequest = { usuario: 'admin', clave: 'secret123' };
    const mockJwt: JwtResponse = {
      token: 'jwt.token.xyz',
      usuario: 'admin',
      nombre: 'Administrador UNSM',
      perfil: 'ADMINISTRADOR',
      debeCambiarClave: false,
    };
    const mockResponse: ApiResponse<JwtResponse> = {
      success: true,
      message: 'Sesión iniciada',
      data: mockJwt,
    };

    service.login(loginPayload).subscribe((res) => {
      expect(res.data?.token).toBe('jwt.token.xyz');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(loginPayload);
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt.token.xyz');
    expect(service.username()).toBe('admin');
    expect(service.isAdmin()).toBe(true);
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
      expect(res.data?.length).toBe(2);
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
});
