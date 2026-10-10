import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AuthUser,
  JwtResponse,
  LoginRequest,
  ModuloResponse,
  normalizeModuloList,
} from '../models';

const STORAGE_KEYS = {
  TOKEN: 'almacen_token',
  USER: 'almacen_user',
  MODULES: 'almacen_modules',
  DEBE_CAMBIAR_CLAVE: 'almacen_debe_cambiar_clave',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function payload(response: unknown): unknown {
  if (!isRecord(response)) return response;
  if (response['exito'] === false || response['success'] === false) {
    throw new Error('El servidor rechazó la operación.');
  }
  return response['datos'] ?? response['data'] ?? response;
}

function parseSession(value: unknown): JwtResponse {
  if (!isRecord(value)) throw new Error('Respuesta de autenticación inválida.');
  const token = value['token'] ?? value['accessToken'] ?? value['jwt'];
  const usuario = value['usuario'] ?? value['username'] ?? value['sub'];
  const nombre = value['nombre'] ?? value['fullName'] ?? value['name'] ?? usuario;
  const rawProfile = value['perfil'] ?? value['role'] ?? value['rol'];
  const perfil = typeof rawProfile === 'string' ? rawProfile.trim().toUpperCase() : '';
  const debeCambiarClave = value['debeCambiarClave'] ?? false;
  if (
    typeof token !== 'string' ||
    !token.trim() ||
    typeof usuario !== 'string' ||
    !usuario.trim() ||
    typeof nombre !== 'string' ||
    !perfil ||
    typeof debeCambiarClave !== 'boolean'
  ) {
    throw new Error('Respuesta de autenticación inválida.');
  }
  return { token, usuario, nombre, perfil, debeCambiarClave };
}

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly initialSession = this.restoreSession();
  private readonly _token = signal<string | null>(this.initialSession?.token ?? null);
  private readonly _currentUser = signal<AuthUser | null>(
    this.initialSession
      ? {
          usuario: this.initialSession.usuario,
          nombre: this.initialSession.nombre,
          perfil: this.initialSession.perfil,
          debeCambiarClave: this.initialSession.debeCambiarClave ?? false,
        }
      : null,
  );
  private readonly _modules = signal<ModuloResponse[]>(this.restoreModules());
  private readonly _modulesLoaded = signal<boolean>(this._modules().length > 0);
  private readonly _debeCambiarClave = signal(this.initialSession?.debeCambiarClave ?? false);
  private modulesRequest?: Observable<ApiResponse<ModuloResponse[]>>;

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly modules = this._modules.asReadonly();
  readonly modulesLoaded = this._modulesLoaded.asReadonly();
  readonly debeCambiarClave = this._debeCambiarClave.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._currentUser());
  readonly username = computed(() => this._currentUser()?.usuario ?? '');
  readonly userFullName = computed(() => this._currentUser()?.nombre ?? '');
  readonly userProfile = computed(() => this._currentUser()?.perfil ?? '');
  readonly isAdmin = computed(() =>
    ['ADMINISTRADOR', 'ADMIN', 'ROLE_ADMIN'].includes(this.userProfile()),
  );
  readonly authorizedModuleCodes = computed<ReadonlySet<string>>(
    () => new Set(this._modules().map((module) => module.codigo.trim().toUpperCase())),
  );
  readonly navigationModules = computed(() =>
    [...this._modules()]
      .filter((module) => this.canAccessModule(module.codigo))
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
  );
  readonly landingUrl = computed(() => '/dashboard');

  login(credentials: LoginRequest): Observable<ApiResponse<JwtResponse>> {
    return defer(() => {
      this.clearSession();
      return this.http.post<unknown>(`${this.apiUrl}/auth/login`, credentials);
    }).pipe(
      map((response) => parseSession(payload(response))),
      tap((jwt) => this.establecerSesion(jwt)),
      map((jwt) => ({ exito: true, datos: jwt })),
    );
  }

  consultarMisModulos(): Observable<ApiResponse<ModuloResponse[]>> {
    if (this.modulesRequest) return this.modulesRequest;
    const sessionToken = this.token();
    const request = this.http.get<unknown>(`${this.apiUrl}/auth/mis-modulos`).pipe(
      map((response) => {
        const data = payload(response);
        let list: unknown[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (isRecord(data) && Array.isArray(data['content'])) {
          list = data['content'];
        } else if (isRecord(data) && Array.isArray(data['datos'])) {
          list = data['datos'];
        } else if (isRecord(data) && Array.isArray(data['data'])) {
          list = data['data'];
        }
        return normalizeModuloList(list);
      }),
      tap((modules) => {
        if (this.token() !== sessionToken) return;
        this._modules.set(modules);
        this._modulesLoaded.set(true);
        this.writeStorage(STORAGE_KEYS.MODULES, JSON.stringify(modules));
      }),
      map((modules) => ({ exito: true, datos: modules })),
      catchError((error: unknown) => {
        if (this._modules().length === 0 && this.token() === sessionToken) {
          this._modulesLoaded.set(false);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.modulesRequest === request) this.modulesRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.modulesRequest = request;
    return request;
  }

  ensureModules(): Observable<boolean> {
    if (!this.isAuthenticated()) return of(false);
    if (this.modulesLoaded()) return of(true);
    return this.consultarMisModulos().pipe(
      map(() => this.isAuthenticated() && this.modulesLoaded()),
      catchError(() => of(false)),
    );
  }

  hasModule(code: string): boolean {
    return this.authorizedModuleCodes().has(code.trim().toUpperCase());
  }

  canAccessUrl(url: string): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAdmin()) return true;
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    if (cleanUrl === '' || cleanUrl === '/dashboard') return true;
    if (cleanUrl === '/inventario' || cleanUrl === '/articulos') {
      return this.canAccessModule('INVENTARIO_ARTICULOS');
    }
    return this.modules().some((m) => {
      const modUrl = m.url.split('?')[0].replace(/\/+$/, '');
      return cleanUrl === modUrl || cleanUrl.startsWith(modUrl + '/');
    });
  }

  canAccessModule(code: string): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAdmin()) return true;
    const normalized = code.trim().toUpperCase();
    if (normalized === 'DASHBOARD') return true;
    if (normalized === 'INVENTARIO') {
      return (
        this.hasModule('INVENTARIO') ||
        this.hasModule('INVENTARIO_ARTICULOS') ||
        this.hasModule('INVENTARIO_FAMILIAS') ||
        this.hasModule('INVENTARIO_MARCAS') ||
        this.hasModule('ARTICULOS')
      );
    }
    if (normalized === 'INVENTARIO_ARTICULOS' || normalized === 'ARTICULOS') {
      return (
        this.hasModule('INVENTARIO_ARTICULOS') ||
        this.hasModule('ARTICULOS') ||
        this.hasModule('INVENTARIO')
      );
    }
    if (normalized === 'INVENTARIO_FAMILIAS' || normalized === 'FAMILIAS') {
      return (
        this.hasModule('INVENTARIO_FAMILIAS') ||
        this.hasModule('FAMILIAS') ||
        this.hasModule('INVENTARIO')
      );
    }
    if (normalized === 'INVENTARIO_MARCAS' || normalized === 'MARCAS') {
      return (
        this.hasModule('INVENTARIO_MARCAS') ||
        this.hasModule('MARCAS') ||
        this.hasModule('INVENTARIO')
      );
    }
    if (normalized === 'SEGURIDAD') {
      return (
        this.hasModule('SEGURIDAD') ||
        this.hasModule('SEGURIDAD_USUARIOS') ||
        this.hasModule('SEGURIDAD_PERFILES') ||
        this.hasModule('USUARIOS') ||
        this.hasModule('PERFILES')
      );
    }
    if (normalized === 'SEGURIDAD_USUARIOS' || normalized === 'USUARIOS') {
      return (
        this.hasModule('SEGURIDAD_USUARIOS') ||
        this.hasModule('USUARIOS') ||
        this.hasModule('SEGURIDAD')
      );
    }
    if (normalized === 'SEGURIDAD_PERFILES' || normalized === 'PERFILES') {
      return (
        this.hasModule('SEGURIDAD_PERFILES') ||
        this.hasModule('PERFILES') ||
        this.hasModule('SEGURIDAD')
      );
    }
    if (normalized === 'ENCARGADOS') {
      return (
        this.hasModule('ENCARGADOS') ||
        this.hasModule('ENCARGADOS_JEFE') ||
        this.hasModule('ENCARGADOS_ALMACEN') ||
        this.hasModule('JEFE')
      );
    }
    if (normalized === 'ENCARGADOS_JEFE' || normalized === 'JEFE') {
      return (
        this.hasModule('ENCARGADOS_JEFE') ||
        this.hasModule('JEFE') ||
        this.hasModule('ENCARGADOS')
      );
    }
    if (normalized === 'ENCARGADOS_ALMACEN') {
      return (
        this.hasModule('ENCARGADOS_ALMACEN') ||
        this.hasModule('ENCARGADOS')
      );
    }
    return this.hasModule(normalized);
  }

  clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    this._modules.set([]);
    this._modulesLoaded.set(false);
    this._debeCambiarClave.set(false);
    this.modulesRequest = undefined;
    for (const key of Object.values(STORAGE_KEYS)) this.removeStorage(key);
  }

  logout(redirect = true): void {
    this.clearSession();
    if (redirect) void this.router.navigate(['/auth/login']);
  }

  setDebeCambiarClave(value: boolean): void {
    this._debeCambiarClave.set(value);
    this.writeStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE, String(value));
    const current = this._currentUser();
    if (current) {
      const user = { ...current, debeCambiarClave: value };
      this._currentUser.set(user);
      this.writeStorage(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  }

  private establecerSesion(jwt: JwtResponse): void {
    const user: AuthUser = {
      usuario: jwt.usuario,
      nombre: jwt.nombre,
      perfil: jwt.perfil,
      debeCambiarClave: jwt.debeCambiarClave ?? false,
    };
    this._token.set(jwt.token);
    this._currentUser.set(user);
    this._debeCambiarClave.set(user.debeCambiarClave);
    this.writeStorage(STORAGE_KEYS.TOKEN, jwt.token);
    this.writeStorage(STORAGE_KEYS.USER, JSON.stringify(user));
    this.writeStorage(STORAGE_KEYS.DEBE_CAMBIAR_CLAVE, String(user.debeCambiarClave));
  }

  private restoreSession(): JwtResponse | null {
    try {
      const token = this.readStorage(STORAGE_KEYS.TOKEN);
      const raw = this.readStorage(STORAGE_KEYS.USER);
      const user: unknown = raw ? JSON.parse(raw) : null;
      return token && isRecord(user) ? parseSession({ ...user, token }) : null;
    } catch {
      return null;
    }
  }

  private restoreModules(): ModuloResponse[] {
    try {
      const raw = this.readStorage(STORAGE_KEYS.MODULES);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return normalizeModuloList(parsed);
    } catch {
      return [];
    }
  }

  private readStorage(key: string): string | null {
    try {
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
    } catch {
      /* La sesión sigue funcionando en memoria cuando el navegador impide persistirla. */
    }
  }

  private removeStorage(key: string): void {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
    } catch {
      /* El estado en memoria ya ha sido eliminado. */
    }
  }
}
