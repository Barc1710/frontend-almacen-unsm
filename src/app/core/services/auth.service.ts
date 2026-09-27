import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AuthUser,
  getApiResponseData,
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
        const jwtData = getApiResponseData(response);
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
        const modulos = getApiResponseData(response) ?? [];
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
      void this.router.navigate(['/login']);
    }
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
  private establecerSesion(jwt: JwtResponse): void {
    const user: AuthUser = {
      usuario: jwt.usuario,
      nombre: jwt.nombre,
      perfil: jwt.perfil,
      debeCambiarClave: jwt.debeCambiarClave,
    };

    this._token.set(jwt.token);
    this._currentUser.set(user);
    this._debeCambiarClave.set(jwt.debeCambiarClave);

    this.persistirEnStorage(STORAGE_KEYS.TOKEN, jwt.token);
    this.persistirEnStorage(STORAGE_KEYS.USER, JSON.stringify(user));
    this.persistirEnStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE, String(jwt.debeCambiarClave));
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
