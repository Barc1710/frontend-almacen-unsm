import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { AuthService, NotificationService } from '../../../../core';
import { PageResponse } from '../../../../core/models';
import { Egreso } from '../../models';
import { EgresoService } from '../../services';
import { EgresosListComponent } from './egresos-list.component';

describe('Consultas de egresos', () => {
  const listar = vi.fn();
  const listarClientesActivos = vi.fn();

  beforeEach(() => {
    listar.mockReset();
    listarClientesActivos.mockReset().mockReturnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAdmin: signal(false) } },
        { provide: NotificationService, useValue: {} },
        {
          provide: EgresoService,
          useValue: {
            listar,
            listarClientesActivos,
            listarAreasActivas: () => of([]),
            listarEncargadosActivos: () => of([]),
            listarEncargadosAlmacenActivos: () => of([]),
          },
        },
      ],
    });
  });

  it('cancela la búsqueda anterior y conserva los resultados de los filtros actuales', () => {
    const primera = new Subject<PageResponse<Egreso>>();
    const segunda = new Subject<PageResponse<Egreso>>();
    listar.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);
    const component = TestBed.createComponent(EgresosListComponent).componentInstance;
    component.cargarEgresos();
    component.onCambioTipoEgreso('BAJA_DETERIORO');
    expect(primera.observed).toBe(false);
    const page = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 10,
      first: true,
      last: true,
      empty: true,
    };
    segunda.next(page);
    primera.error(new Error('Respuesta obsoleta'));
    expect(component.errorListado()).toBeNull();
    expect(component.cargando()).toBe(false);
  });

  it('distingue errores del servidor de resultados vacíos', () => {
    listar.mockReturnValue(throwError(() => new Error('Sin conexión')));
    const component = TestBed.createComponent(EgresosListComponent).componentInstance;
    component.cargarEgresos();
    expect(component.errorListado()).toBeTruthy();
    expect(component.cargando()).toBe(false);
  });

  it('bloquea el registro al fallar los catálogos y permite reintentar', () => {
    listarClientesActivos
      .mockReturnValueOnce(throwError(() => new Error('Sin conexión')))
      .mockReturnValueOnce(of([]));
    const component = TestBed.createComponent(EgresosListComponent).componentInstance;
    component.cargarCatalogos();
    component.abrirNuevoDespacho();
    expect(component.errorCatalogos()).toBeTruthy();
    expect(component.modalRegistroVisible()).toBe(false);
    component.cargarCatalogos();
    component.abrirNuevoDespacho();
    expect(component.errorCatalogos()).toBeNull();
    expect(component.modalRegistroVisible()).toBe(true);
  });
});
