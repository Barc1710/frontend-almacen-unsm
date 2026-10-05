import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import {
  getApiResponseData,
  isApiResponse,
  isPageResponse,
  PageResponse,
} from '../../core/models/api-response.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { Cliente, NuevoCliente } from './cliente.model';

const DEMO_CLIENTS: Cliente[] = Array.from({ length: 89 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');

  return {
    id: `demo-${index + 1}`,
    dni: String(10000000 + index),
    nombre: `Cliente ${number}`,
    direccion: `Dirección de ejemplo ${number}`,
    telefono: `900000${String(index).padStart(3, '0')}`,
    correo: `cliente${number}@ejemplo.com`,
    estado: '1',
  };
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly endpoint = `${environment.apiUrl}/clientes`;
  private readonly demoClients = signal<Cliente[]>(DEMO_CLIENTS);
  private nextDemoId = DEMO_CLIENTS.length + 1;

  readonly puedeModificar = computed<boolean>(() =>
    this.authService.isDemoMode() ||
    this.authService.isAdmin() ||
    this.authService.hasModule('CLIENTES') ||
    this.authService.canAccessModule('CLIENTES')
  );

  readonly puedeEliminar = computed<boolean>(() =>
    this.authService.isDemoMode() ||
    this.authService.isAdmin()
  );

  obtenerPagina(page: number, size: number, filtro?: string): Observable<PageResponse<Cliente>> {
    if (this.authService.isDemoMode()) {
      let clients = this.demoClients();
      if (filtro && filtro.trim()) {
        const term = filtro.trim().toLowerCase();
        clients = clients.filter((item) => {
          const dni = String(item.dni ?? '').toLowerCase();
          const nombre = String(item.nombre ?? '').toLowerCase();
          const correo = String(item.correo ?? '').toLowerCase();
          return dni.includes(term) || nombre.includes(term) || correo.includes(term);
        });
      }

      const totalPages = Math.ceil(clients.length / size) || 1;
      const content = clients.slice(page * size, (page + 1) * size);

      return of({
        content,
        page,
        number: page,
        size,
        totalElements: clients.length,
        totalPages,
        first: page === 0,
        last: page + 1 >= totalPages,
        numberOfElements: content.length,
        empty: content.length === 0,
      });
    }

    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (filtro && filtro.trim()) {
      params = params.set('filtro', filtro.trim());
    }

    return this.http
      .get<unknown>(this.endpoint, { params })
      .pipe(map((response) => this.normalizarPagina(response, page, size)));
  }

  registrar(cliente: NuevoCliente): Observable<void> {
    if (this.authService.isDemoMode()) {
      const duplicado = this.demoClients().some((item) => String(item.dni ?? '') === cliente.dni);
      if (duplicado) {
        return throwError(() => new Error(`Ya existe un cliente con DNI ${cliente.dni}.`));
      }

      this.demoClients.update((clients) => [
        {
          id: `demo-${this.nextDemoId++}`,
          dni: cliente.dni,
          nombre: cliente.nombre,
          direccion: cliente.direccion,
          telefono: cliente.telefono,
          correo: cliente.correo,
          estado: '1',
        },
        ...clients,
      ]);
      return of(undefined);
    }

    const payload = {
      dni: cliente.dni?.trim() || null,
      nombre: cliente.nombre.trim(),
      direccion: cliente.direccion?.trim() || null,
      telefono: cliente.telefono?.trim() || null,
      correo: cliente.correo?.trim() || null,
    };

    return this.http.post<unknown>(this.endpoint, payload).pipe(map(() => undefined));
  }

  actualizar(original: Cliente, cliente: NuevoCliente): Observable<void> {
    if (!this.puedeModificar()) {
      return throwError(
        () => new Error('La edición requiere que el backend habilite la operación.'),
      );
    }

    if (this.authService.isDemoMode()) {
      this.demoClients.update((clients) =>
        clients.map((item) =>
          this.clave(item) === this.clave(original)
            ? {
                id: item.id,
                dni: cliente.dni,
                nombre: cliente.nombre,
                direccion: cliente.direccion,
                telefono: cliente.telefono,
                correo: cliente.correo,
                estado: item.estado ?? '1',
              }
            : item,
        ),
      );
      return of(undefined);
    }

    const id = original.id ?? original.dni;
    const payload = {
      dni: cliente.dni?.trim() || null,
      nombre: cliente.nombre.trim(),
      direccion: cliente.direccion?.trim() || null,
      telefono: cliente.telefono?.trim() || null,
      correo: cliente.correo?.trim() || null,
    };

    return this.http.put<unknown>(`${this.endpoint}/${id}`, payload).pipe(map(() => undefined));
  }

  eliminar(cliente: Cliente): Observable<void> {
    if (!this.puedeEliminar() && !this.puedeModificar()) {
      return throwError(
        () => new Error('La eliminación requiere que el backend habilite la operación.'),
      );
    }

    if (this.authService.isDemoMode()) {
      this.demoClients.update((clients) =>
        clients.filter((item) => this.clave(item) !== this.clave(cliente)),
      );
      return of(undefined);
    }

    const id = cliente.id ?? cliente.dni;
    return this.http.delete<unknown>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }

  private clave(cliente: Cliente): string {
    return String(cliente.id ?? cliente.dni);
  }

  private normalizarPagina(
    response: unknown,
    requestedPage = 0,
    requestedSize = 10,
  ): PageResponse<Cliente> {
    const data = isApiResponse(response) ? getApiResponseData(response) : response;

    if (!isRecord(data)) {
      throw new Error('La respuesta del servidor no contiene una página válida de clientes.');
    }

    if (isPageResponse<unknown>(data)) {
      const content: Cliente[] = data.content.map((item) => this.mapToCliente(item));
      const page =
        typeof data.page === 'number'
          ? data.page
          : typeof data.number === 'number'
            ? data.number
            : requestedPage;
      const size = typeof data.size === 'number' ? data.size : requestedSize;
      const totalElements =
        typeof data.totalElements === 'number' ? data.totalElements : content.length;
      const totalPages =
        typeof data.totalPages === 'number'
          ? data.totalPages
          : Math.ceil(totalElements / (size || 10));

      return {
        content,
        page,
        number: page,
        size,
        totalElements,
        totalPages,
        first: data.first ?? page === 0,
        last: data.last ?? page + 1 >= totalPages,
        numberOfElements: data.numberOfElements ?? content.length,
        empty: data.empty ?? content.length === 0,
      };
    }

    throw new Error('La respuesta del servidor no contiene una página válida de clientes.');
  }

  private mapToCliente(item: unknown): Cliente {
    if (!isRecord(item)) {
      return { id: '', dni: '', nombre: '' };
    }
    return {
      id: (item['id'] as string | number) ?? undefined,
      dni: item['dni'] != null ? String(item['dni']) : null,
      nombre: (item['nombre'] as string) ?? null,
      nombres: (item['nombres'] as string) ?? null,
      apellidos: (item['apellidos'] as string) ?? null,
      direccion: (item['direccion'] as string) ?? null,
      telefono: (item['telefono'] as string) ?? null,
      correo: (item['correo'] as string) ?? null,
      estado: item['estado'] != null ? String(item['estado']) : '1',
    };
  }
}
