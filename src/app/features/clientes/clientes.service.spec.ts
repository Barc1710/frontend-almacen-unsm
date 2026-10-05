import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Cliente, NuevoCliente } from './cliente.model';
import { ClientesService } from './clientes.service';
import { PageResponse } from '../../core/models/api-response.model';

describe('ClientesService', () => {
  let service: ClientesService;
  let authService: AuthService;
  let httpTesting: HttpTestingController;
  const endpoint = `${environment.apiUrl}/clientes`;

  const nuevoCliente: NuevoCliente = {
    dni: '87654321',
    nombre: 'María Torres',
    direccion: 'Av. Principal 123',
    telefono: '987654321',
    correo: 'maria@ejemplo.com',
  };

  function limpiarSesion(): void {
    window.sessionStorage.removeItem('almacen_token');
    window.sessionStorage.removeItem('almacen_user');
    window.sessionStorage.removeItem('almacen_modules');
    window.sessionStorage.removeItem('almacen_debe_cambiar_clave');
  }

  function configurar(demo: boolean): void {
    limpiarSesion();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard', children: [] }]),
      ],
    });

    service = TestBed.inject(ClientesService);
    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);

    if (demo) {
      authService.iniciarSesionDemo();
    }
  }

  function obtenerPagina(page: number): PageResponse<Cliente> {
    let result: PageResponse<Cliente> | undefined;
    service.obtenerPagina(page, 10).subscribe((value) => (result = value));
    return result as PageResponse<Cliente>;
  }

  afterEach(() => {
    limpiarSesion();
    httpTesting?.verify();
  });

  it('expone la capacidad de modificar según la sesión activa', () => {
    configurar(true);
    expect(service.puedeModificar()).toBe(true);
  });

  it('pagina el listado demo sin realizar peticiones al backend', () => {
    configurar(true);

    const page = obtenerPagina(0);

    expect(page.totalElements).toBe(89);
    expect(page.totalPages).toBe(9);
    expect(page.content).toHaveLength(10);
    expect(page.content[0].dni).toBe('10000000');
    expect(service.puedeModificar()).toBe(true);
  });

  it('consulta el backend con los parámetros de paginación cuando no hay sesión demo', () => {
    configurar(false);

    let result: PageResponse<Cliente> | undefined;
    service.obtenerPagina(2, 10).subscribe((value) => (result = value));

    const request = httpTesting.expectOne(
      (req) =>
        req.url === endpoint && req.params.get('page') === '2' && req.params.get('size') === '10',
    );
    request.flush({
      data: {
        content: [{ dni: '12345678', nombre: 'Ana Cliente' }],
        number: 2,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      },
    });

    expect(result?.content[0].dni).toBe('12345678');
    expect(service.puedeModificar()).toBe(false);
  });

  it('rechaza la respuesta del backend cuando la página no contiene clientes válidos', () => {
    configurar(false);

    let emitted: PageResponse<Cliente> | undefined;
    let failure: Error | undefined;
    service.obtenerPagina(0, 10).subscribe({
      next: (value) => (emitted = value),
      error: (error: Error) => (failure = error),
    });

    httpTesting
      .expectOne((request) => request.url === endpoint)
      .flush({ data: { contenido: [] } });

    expect(emitted).toBeUndefined();
    expect(failure?.message).toContain('página válida de clientes');
  });

  it('impide registrar un DNI duplicado en la sesión demo', () => {
    configurar(true);

    let registered = false;
    let failure: Error | undefined;
    service.registrar({ ...nuevoCliente, dni: '10000000' }).subscribe({
      next: () => (registered = true),
      error: (error: Error) => (failure = error),
    });

    expect(registered).toBe(false);
    expect(failure?.message).toContain('Ya existe un cliente con DNI 10000000');
  });

  it('registra un cliente nuevo en la sesión demo y lo coloca al inicio', () => {
    configurar(true);

    let registered = false;
    service.registrar(nuevoCliente).subscribe(() => (registered = true));
    const page = obtenerPagina(0);

    expect(registered).toBe(true);
    expect(page.totalElements).toBe(90);
    expect(page.content[0].dni).toBe('87654321');
    expect(page.content[0].nombre).toBe('María Torres');
  });

  it('actualiza los datos de un cliente en la sesión demo', () => {
    configurar(true);

    const original = obtenerPagina(0).content[0];
    let updated = false;
    service
      .actualizar(original, { ...nuevoCliente, dni: String(original.dni) })
      .subscribe(() => (updated = true));
    const page = obtenerPagina(0);

    expect(updated).toBe(true);
    expect(page.content[0].nombre).toBe('María Torres');
    expect(page.content[0].dni).toBe(original.dni);
  });

  it('elimina un cliente en la sesión demo', () => {
    configurar(true);

    const original = obtenerPagina(0).content[0];
    let deleted = false;
    service.eliminar(original).subscribe(() => (deleted = true));
    const page = obtenerPagina(0);

    expect(deleted).toBe(true);
    expect(page.totalElements).toBe(88);
    expect(page.content.some((cliente) => cliente.dni === original.dni)).toBe(false);
  });

  it('envía el cliente con su DNI al backend cuando no hay sesión demo', () => {
    configurar(false);

    let registered = false;
    service.registrar(nuevoCliente).subscribe(() => (registered = true));

    const request = httpTesting.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      dni: '87654321',
      nombre: 'María Torres',
      direccion: 'Av. Principal 123',
      telefono: '987654321',
      correo: 'maria@ejemplo.com',
    });
    request.flush({ success: true });

    expect(registered).toBe(true);
  });

  it('bloquea la edición y la eliminación cuando el backend aún no las soporta', () => {
    configurar(false);

    const cliente: Cliente = { dni: '12345678', nombre: 'Ana Cliente' };
    let updated = false;
    let deleted = false;
    let updateFailure: Error | undefined;
    let deleteFailure: Error | undefined;

    service.actualizar(cliente, nuevoCliente).subscribe({
      next: () => (updated = true),
      error: (error: Error) => (updateFailure = error),
    });
    service.eliminar(cliente).subscribe({
      next: () => (deleted = true),
      error: (error: Error) => (deleteFailure = error),
    });

    expect(updated).toBe(false);
    expect(deleted).toBe(false);
    expect(updateFailure?.message).toContain('backend');
    expect(deleteFailure?.message).toContain('backend');
  });
});
