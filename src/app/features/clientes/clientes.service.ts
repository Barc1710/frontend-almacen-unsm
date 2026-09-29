import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import {
  getApiResponseData,
  isApiResponse,
  PageResponse,
} from '../../core/models/api-response.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { Cliente, isClientePage, NuevoCliente } from './cliente.model';

const DEMO_CLIENTS: Cliente[] = Array.from({ length: 89 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');

  return {
    id: `demo-${index + 1}`,
    dni: String(10000000 + index),
    nombre: `Cliente ${number}`,
    direccion: `Dirección de ejemplo ${number}`,
    telefono: `900000${String(index).padStart(3, '0')}`,
    correo: `cliente${number}@ejemplo.com`,
  };
});

@Service()
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly endpoint = `${environment.apiUrl}/clientes`;
  private readonly demoClients = signal<Cliente[]>(DEMO_CLIENTS);
  private nextDemoId = DEMO_CLIENTS.length + 1;

  readonly puedeModificar = computed<boolean>(() => this.authService.isDemoMode());

  obtenerPagina(page: number, size: number): Observable<PageResponse<Cliente>> {
    if (this.puedeModificar()) {
      const clients = this.demoClients();
      const totalPages = Math.ceil(clients.length / size);
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

    const params = new HttpParams().set('page', page).set('size', size);

    return this.http
      .get<unknown>(this.endpoint, { params })
      .pipe(map((response) => this.normalizarPagina(response)));
  }

  registrar(cliente: NuevoCliente): Observable<void> {
    if (this.puedeModificar()) {
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
        },
        ...clients,
      ]);
      return of(undefined);
    }

    const payload = { dni: cliente.dni, ...this.detalles(cliente) };

    return this.http.post<unknown>(this.endpoint, payload).pipe(map(() => undefined));
  }

  actualizar(original: Cliente, cliente: NuevoCliente): Observable<void> {
    if (!this.puedeModificar()) {
      return throwError(
        () => new Error('La edición requiere que el backend habilite la operación.'),
      );
    }

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
            }
          : item,
      ),
    );
    return of(undefined);
  }

  eliminar(cliente: Cliente): Observable<void> {
    if (!this.puedeModificar()) {
      return throwError(
        () => new Error('La eliminación requiere que el backend habilite la operación.'),
      );
    }

    this.demoClients.update((clients) =>
      clients.filter((item) => this.clave(item) !== this.clave(cliente)),
    );
    return of(undefined);
  }

  private clave(cliente: Cliente): string {
    return String(cliente.id ?? cliente.dni);
  }

  private detalles(cliente: NuevoCliente): Omit<NuevoCliente, 'dni'> {
    return {
      nombre: cliente.nombre,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      correo: cliente.correo,
    };
  }

  private normalizarPagina(response: unknown): PageResponse<Cliente> {
    const data = isApiResponse(response) ? getApiResponseData(response) : response;

    if (!isClientePage(data)) {
      throw new Error('La respuesta del servidor no contiene una página válida de clientes.');
    }

    return data;
  }
}
