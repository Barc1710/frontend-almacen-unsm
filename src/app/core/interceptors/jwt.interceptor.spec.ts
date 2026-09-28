import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  const mockToken = signal<string | null>('valid-jwt-token');

  beforeEach(() => {
    mockToken.set('valid-jwt-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            token: mockToken.asReadonly(),
          },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe agregar la cabecera Authorization: Bearer cuando el token existe y la petición va al backend', () => {
    httpClient.get(`${environment.apiUrl}/articulos`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/articulos`);
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    req.flush({});
  });

  it('no debe agregar cabecera Authorization en la petición de login (/auth/login)', () => {
    httpClient.post(`${environment.apiUrl}/auth/login`, { usuario: 'u', clave: 'p' }).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no debe agregar cabecera Authorization si no hay token disponible', () => {
    mockToken.set(null);

    httpClient.get(`${environment.apiUrl}/articulos`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/articulos`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
  it.each([
    '//external.example/api/v1/articulos',
    '//localhost:8080/api/v1/articulos',
    'https://external.example/api/v1/articulos',
    'http://localhost:8080.evil.example/api/v1/articulos',
    'http://localhost:8081/api/v1/articulos',
    'https://localhost:8080/api/v1/articulos',
    `${environment.apiUrl}-externa/articulos`,
    `${environment.apiUrl}0/articulos`,
    `${environment.apiUrl}/../privado`,
    `${environment.apiUrl}/%2e%2e/privado`,
    `${environment.apiUrl}/%2fprivado`,
    '/api/v1/articulos',
    '/images/logos/escudo_unsm.png',
  ])('no adjunta el token a un destino fuera de la API: %s', (url) => {
    httpClient.get(url).subscribe();
    const req = httpTesting.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('excluye login con query y barra final', () => {
    const url = `${environment.apiUrl}/auth/login/?source=dev`;
    httpClient.post(url, {}).subscribe();
    const req = httpTesting.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no confunde un texto en query con el endpoint de login', () => {
    const url = `${environment.apiUrl}/articulos?next=/auth/login`;
    httpClient.get(url).subscribe();
    const req = httpTesting.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    expect(req.request.redirect).toBe('error');
    req.flush({});
  });
});
