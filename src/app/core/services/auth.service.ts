import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AuthUser,
  getApiResponseData,
  isJwtResponse,
  JwtResponse,
  LoginRequest,
  ModuloResponse,
} from '../models';

const STORAGE_KEYS = {
  TOKEN: 'almacen_token',
  USER: 'almacen_user',
  MODULES: 'almacen_modules',
  DEBE_CAMBIAR_CLAVE: 'almacen_debe_cambiar_clave',
} as const;

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = environment.apiUrl;

  // Estado reactivo basado en Signals
  private readonly _token = signal<string | null>(this.getInitialToken());
  private readonly _currentUser = signal<AuthUser | null>(this.getInitialUser());
  private readonly _modules = signal<ModuloResponse[]>(this.getInitialModules());
  private readonly _debeCambiarClave = signal<boolean>(this.getInitialDebeCambiarClave());

  // Señales públicas de solo lectura
  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly modules = this._modules.asReadonly();
  readonly debeCambiarClave = this._debeCambiarClave.asReadonly();

  // Selectores computados (Derived State)
  readonly isAuthenticated = computed<boolean>(() => !!this._token());
  readonly username = computed<string>(() => this._currentUser()?.usuario ?? '');
  readonly userFullName = computed<string>(() => this._currentUser()?.nombre ?? '');
  readonly userProfile = computed<string>(() => this._currentUser()?.perfil ?? '');
  readonly isAdmin = computed<boolean>(
    () => this._currentUser()?.perfil?.trim().toUpperCase() === 'ADMINISTRADOR',
  );
  readonly authorizedModuleCodes = computed<Set<string>>(
    () => new Set(this._modules().map((m) => m.codigo.trim().toUpperCase())),
  );

  /**
   * Inicia sesión autenticando credenciales contra el backend.
   * Almacena el token y los datos de perfil en el estado reactivo y en sessionStorage.
   */
  login(credentials: LoginRequest): Observable<ApiResponse<JwtResponse>> {
    return this.http.post<ApiResponse<JwtResponse>>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        const rawData = getApiResponseData(response);
        const jwtData =
          rawData && typeof rawData === 'object'
            ? (rawData as JwtResponse)
            : isJwtResponse(response)
              ? response
              : null;
        if (jwtData) {
          this.establecerSesion(jwtData);
        }
      }),
    );
  }

  /**
   * Consulta al backend los módulos autorizados y activos para el usuario en sesión actual.
   * Actualiza el estado reactivo y el almacenamiento persistente de sesión.
   */
  consultarMisModulos(): Observable<ApiResponse<ModuloResponse[]>> {
    return this.http.get<ApiResponse<ModuloResponse[]>>(`${this.apiUrl}/auth/mis-modulos`).pipe(
      tap((response) => {
        const data = getApiResponseData(response);
        const modulos = Array.isArray(data)
          ? data
          : Array.isArray(response)
            ? (response as unknown as ModuloResponse[])
            : [];
        this._modules.set(modulos);
        this.persistirEnStorage(STORAGE_KEYS.MODULES, JSON.stringify(modulos));
      }),
    );
  }

  /**
   * Verifica si el usuario autenticado tiene acceso a un módulo específico por su código.
   */
  hasModule(moduloCodigo: string): boolean {
    return this.authorizedModuleCodes().has(moduloCodigo.trim().toUpperCase());
  }

  /**
   * Limpia el estado reactivo de sesión y el almacenamiento local sin disparar navegación.
   * Utilizado internamente o por interceptores ante respuestas 401.
   */
  clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    this._modules.set([]);
    this._debeCambiarClave.set(false);

    this.removerDeStorage(STORAGE_KEYS.TOKEN);
    this.removerDeStorage(STORAGE_KEYS.USER);
    this.removerDeStorage(STORAGE_KEYS.MODULES);
    this.removerDeStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE);
  }

  /**
   * Cierra la sesión activa del usuario, limpia el almacenamiento y redirige a la pantalla de login.
   */
  logout(redirect: boolean = true): void {
    this.clearSession();
    if (redirect) {
      void this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Genera una sesión simulada de pruebas en sessionStorage con perfil Administrador
   * y módulos básicos habilitados, redirigiendo inmediatamente al dashboard principal ('/').
   */
  iniciarSesionDemo(): void {
    const demoJwt: JwtResponse = {
      token: 'demo-token-unsm-almacen-2026',
      usuario: 'admin.demo',
      nombre: 'Administrador Demo - UNSM',
      perfil: 'ADMINISTRADOR',
      debeCambiarClave: false,
    };

    const demoModules: ModuloResponse[] = [
      {
        id: 1,
        codigo: 'DASHBOARD',
        nombre: 'Dashboard Principal',
        url: '/dashboard',
        icono: 'DASHBOARD',
        orden: 1,
      },
      {
        id: 2,
        codigo: 'ARTICULOS',
        nombre: 'Catálogo de Bienes',
        url: '/articulos',
        icono: 'ARTICULOS',
        orden: 2,
      },
      {
        id: 3,
        codigo: 'KARDEX',
        nombre: 'Control de Inventario',
        url: '/kardex',
        icono: 'KARDEX',
        orden: 3,
      },
      {
        id: 4,
        codigo: 'INGRESOS',
        nombre: 'Entradas de Almacén',
        url: '/ingresos',
        icono: 'INGRESOS',
        orden: 4,
      },
      {
        id: 5,
        codigo: 'EGRESOS',
        nombre: 'Despachos y Salidas',
        url: '/egresos',
        icono: 'EGRESOS',
        orden: 5,
      },
      {
        id: 6,
        codigo: 'SOLICITUDES',
        nombre: 'Pedidos y PECOSA',
        url: '/solicitudes',
        icono: 'SOLICITUDES',
        orden: 6,
      },
    ];

    this.establecerSesion(demoJwt);
    this._modules.set(demoModules);
    this.persistirEnStorage(STORAGE_KEYS.MODULES, JSON.stringify(demoModules));

    void this.router.navigate(['/']);
  }

  /**
   * Actualiza el estado de la bandera debeCambiarClave (ej. tras un cambio exitoso de contraseña).
   */
  setDebeCambiarClave(valor: boolean): void {
    this._debeCambiarClave.set(valor);
    this.persistirEnStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE, String(valor));

    const current = this._currentUser();
    if (current) {
      const updatedUser: AuthUser = { ...current, debeCambiarClave: valor };
      this._currentUser.set(updatedUser);
      this.persistirEnStorage(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  }

  /**
   * Establece internamente la sesión a partir de la respuesta JWT.
   */
  private establecerSesion(jwt: JwtResponse | Record<string, unknown>): void {
    const raw = jwt as Record<string, unknown>;
    const token = (raw['token'] ?? raw['accessToken'] ?? raw['jwt'] ?? '') as string;
    const usuario = (raw['usuario'] ?? raw['username'] ?? raw['sub'] ?? '') as string;
    const nombre = (raw['nombre'] ?? raw['fullName'] ?? raw['name'] ?? usuario) as string;
    const perfil = (raw['perfil'] ?? raw['role'] ?? raw['rol'] ?? 'USUARIO') as string;
    const debeCambiarClave = Boolean(raw['debeCambiarClave']);

    if (!token) {
      console.warn('[AuthService] No se encontró token en la respuesta de autenticación:', jwt);
      return;
    }

    const user: AuthUser = {
      usuario,
      nombre,
      perfil,
      debeCambiarClave,
    };

    this._token.set(token);
    this._currentUser.set(user);
    this._debeCambiarClave.set(debeCambiarClave);

    this.persistirEnStorage(STORAGE_KEYS.TOKEN, token);
    this.persistirEnStorage(STORAGE_KEYS.USER, JSON.stringify(user));
    this.persistirEnStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE, String(debeCambiarClave));
  }

  // Métodos auxiliares seguros para recuperación inicial desde sessionStorage
  private getInitialToken(): string | null {
    return this.leerDeStorage(STORAGE_KEYS.TOKEN);
  }

  private getInitialUser(): AuthUser | null {
    const raw = this.leerDeStorage(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private getInitialModules(): ModuloResponse[] {
    const raw = this.leerDeStorage(STORAGE_KEYS.MODULES);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ModuloResponse[];
    } catch {
      return [];
    }
  }

  private getInitialDebeCambiarClave(): boolean {
    const raw = this.leerDeStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE);
    return raw === 'true';
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  }

  private leerDeStorage(key: string): string | null {
    if (!this.isBrowser()) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private persistirEnStorage(key: string, value: string): void {
    if (!this.isBrowser()) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Manejo silencioso ante restricciones de cuota o modo incógnito
    }
  }

  private removerDeStorage(key: string): void {
    if (!this.isBrowser()) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Manejo silencioso
    }
  }
}
