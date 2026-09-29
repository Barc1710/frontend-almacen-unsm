import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceSpy: {
    clearSession: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    consultarMisModulos: ReturnType<typeof vi.fn>;
  };
  let routerSpy: {
    navigate: ReturnType<typeof vi.fn>;
    url: string;
  };

  beforeEach(() => {
    authServiceSpy = {
      clearSession: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      consultarMisModulos: vi.fn().mockReturnValue(of({ success: true, data: [] })),
    };

    routerSpy = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/articulos',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('ante 401 Unauthorized debe limpiar la sesión y redirigir al login', () => {
    httpClient.get(`${environment.apiUrl}/articulos`).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/articulos`);
    req.flush(
      { success: false, message: 'No autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/articulos' },
    });
  });

  it('ante 403 con cuenta inactiva debe limpiar sesión y redirigir a login', () => {
    httpClient.get(`${environment.apiUrl}/articulos`).subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/articulos`);
    req.flush(
      { success: false, message: 'Usuario inactivo.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { error: 'account_inactive' },
    });
  });

  it('ante 403 por falta de permisos debe intentar sincronizar mis módulos', () => {
    httpClient.get(`${environment.apiUrl}/egresos`).subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/egresos`);
    req.flush(
      { success: false, message: 'Acceso denegado.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(authServiceSpy.consultarMisModulos).toHaveBeenCalled();
  });

  it('ante 409 Conflict debe propagar el error conteniendo el mensaje de negocio', () => {
    const errorBody = {
      success: false,
      message: 'Stock insuficiente para el artículo solicitado.',
    };

    httpClient.post(`${environment.apiUrl}/egresos`, {}).subscribe({
      error: (err) => {
        expect(err.status).toBe(409);
        expect(err.error.message).toBe('Stock insuficiente para el artículo solicitado.');
      },
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/egresos`);
    req.flush(errorBody, { status: 409, statusText: 'Conflict' });
  });
});
