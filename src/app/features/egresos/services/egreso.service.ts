import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiResponseData,
  isPageResponse,
  PageResponse,
} from '../../../core/models';
import { ArticuloResumen } from '../../articulos/models';
import { ArticuloService } from '../../articulos/services/articulo.service';
import {
  Area,
  Cliente,
  DetalleEgreso,
  Egreso,
  EgresoConDetalles,
  EgresoCreateRequest,
  EgresoFiltros,
  Encargado,
  EncargadoAlmacen,
} from '../models';

@Service()
export class EgresoService {
  private readonly articuloService = inject(ArticuloService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private clientesCache$?: Observable<Cliente[]>;
  private areasCache$?: Observable<Area[]>;
  private encargadosCache$?: Observable<Encargado[]>;
  private encargadosAlmacenCache$?: Observable<EncargadoAlmacen[]>;

  /**
   * Consulta paginada de comprobantes de egreso (despachos y actas de baja) con filtros.
   */
  listar(filtros: EgresoFiltros = {}): Observable<PageResponse<Egreso>> {
    let params = new HttpParams();

    const append = (key: string, val: string | number | undefined | null) => {
      if (val !== undefined && val !== null) {
        const text = String(val).trim();
        if (text) params = params.set(key, text);
      }
    };

    append('filtro', filtros.filtro);
    append('idCliente', filtros.idCliente);
    append('idArea', filtros.idArea);
    if (filtros.tipoEgreso && filtros.tipoEgreso !== 'TODOS') {
      append('tipoEgreso', filtros.tipoEgreso);
    }
    append('desde', filtros.desde || filtros.fechaInicio);
    append('hasta', filtros.hasta || filtros.fechaFin);
    append('estado', filtros.estado);
    append('sort', filtros.sort || 'fecha,desc');

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString()).set('size', size.toString());

    return this.http.get<unknown>(`${this.apiUrl}/egresos`, { params }).pipe(
      map((response) => {
        let pageData: PageResponse<unknown> | undefined;

        if (isPageResponse<unknown>(response)) {
          pageData = response;
        } else if (typeof response === 'object' && response !== null) {
          pageData = getApiResponseData(response as ApiResponse<PageResponse<unknown>>);
        }

        if (pageData && Array.isArray(pageData.content)) {
          const contentNormalizado = pageData.content.map((item) =>
            this.normalizarEgreso(item as Record<string, unknown>),
          );
          return {
            ...pageData,
            content: contentNormalizado,
          } as PageResponse<Egreso>;
        }

        return {
          content: [],
          page,
          number: page,
          size,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
          empty: true,
        };
      }),
    );
  }

  /**
   * Obtiene la información completa de un egreso junto con su colección de artículos despachados.
   */
  obtenerPorId(id: number): Observable<EgresoConDetalles> {
    return this.http.get<unknown>(`${this.apiUrl}/egresos/${id}`).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<
            string,
            unknown
          >;
          if (data && typeof data === 'object') {
            return this.normalizarEgresoConDetalles(data);
          }
        }
        throw new Error('Comprobante de egreso no encontrado');
      }),
    );
  }

  /**
   * Registra transaccionalmente un nuevo despacho o baja con afectación al inventario.
   */
  registrar(request: EgresoCreateRequest): Observable<EgresoConDetalles> {
    const payload = {
      idCliente: Number(request.idCliente),
      idEncargado: request.idEncargado ? Number(request.idEncargado) : null,
      nombreEncargadoLibre: request.nombreEncargadoLibre?.trim() || null,
      tipoEgreso: request.tipoEgreso || 'DESPACHO_ORDINARIO',
      idArea: Number(request.idArea),
      idEncargadoAlmacen: Number(request.idEncargadoAlmacen),
      ambiente: request.ambiente?.trim() || null,
      prefijo: request.prefijo?.trim() || null,
      detalles: request.detalles.map((d) => ({
        idArticulo: Number(d.idArticulo),
        cantidad: Number(d.cantidad),
      })),
    };

    return this.http.post<unknown>(`${this.apiUrl}/egresos`, payload).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<
            string,
            unknown
          >;
          if (data && typeof data === 'object') {
            return this.normalizarEgresoConDetalles(data);
          }
        }
        throw new Error('Error al registrar el egreso');
      }),
    );
  }

  /**
   * Anula un egreso activo y revierte las existencias correspondientes al stock general.
   */
  anular(id: number): Observable<EgresoConDetalles> {
    return this.http.post<unknown>(`${this.apiUrl}/egresos/${id}/anular`, {}).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<
            string,
            unknown
          >;
          if (data && typeof data === 'object') {
            return this.normalizarEgresoConDetalles(data);
          }
        }
        throw new Error('Error al anular el comprobante de despacho');
      }),
    );
  }

  /**
   * Consulta el catálogo de clientes / destinatarios activos.
   */
  listarClientesActivos(): Observable<Cliente[]> {
    return (this.clientesCache$ ??= this.fetchCatalog<Cliente>('/clientes/activos', () => {
      this.clientesCache$ = undefined;
    }));
  }

  /**
   * Consulta el catálogo de áreas universitarias activas.
   */
  listarAreasActivas(): Observable<Area[]> {
    return (this.areasCache$ ??= this.fetchCatalog<Area>('/areas/activos', () => {
      this.areasCache$ = undefined;
    }));
  }

  /**
   * Consulta el catálogo de encargados receptores activos.
   */
  listarEncargadosActivos(): Observable<Encargado[]> {
    return (this.encargadosCache$ ??= this.fetchCatalog<Encargado>('/encargados/activos', () => {
      this.encargadosCache$ = undefined;
    }));
  }

  /**
   * Consulta el catálogo de encargados de almacén activos (titular y suplentes).
   */
  listarEncargadosAlmacenActivos(): Observable<EncargadoAlmacen[]> {
    return (this.encargadosAlmacenCache$ ??= this.fetchCatalog<EncargadoAlmacen>(
      '/encargados-almacen/activos',
      () => {
        this.encargadosAlmacenCache$ = undefined;
      },
    ));
  }

  /**
   * Búsqueda predictiva conectada a GET /api/v1/articulos/buscar?q=...&soloConStock=true
   * para asegurar que la ventanilla de almacén solo ofrezca artículos con saldo disponible.
   */
  buscarArticulosPredictivo(query: string, soloConStock = true): Observable<ArticuloResumen[]> {
    return this.articuloService.buscarPredictivo(query, soloConStock);
  }

  /**
   * Normaliza un objeto de egreso para renderizado consistente.
   */
  private normalizarEgreso(raw: Record<string, unknown>): Egreso {
    const id = Number(raw['id']);
    const idCliente = Number(raw['idCliente']);
    const nombreCliente =
      typeof raw['nombreCliente'] === 'string'
        ? raw['nombreCliente']
        : 'Destinatario no especificado';

    const idArea = Number(raw['idArea']);
    const nombreArea =
      typeof raw['nombreArea'] === 'string' ? raw['nombreArea'] : 'Área no asignada';

    const idEncargadoAlmacen = Number(raw['idEncargadoAlmacen']);
    const nombreEncargadoAlmacen =
      typeof raw['nombreEncargadoAlmacen'] === 'string'
        ? raw['nombreEncargadoAlmacen']
        : 'Encargado de almacén';

    const prefijo = typeof raw['prefijo'] === 'string' ? raw['prefijo'] : 'E26';
    const correlativo = typeof raw['correlativo'] === 'number' ? raw['correlativo'] : 0;
    const rawNumero = typeof raw['numeroCompleto'] === 'string' ? raw['numeroCompleto'] : null;
    const numeroCompleto = rawNumero || `${prefijo}-${String(correlativo).padStart(4, '0')}`;

    const tipoEgreso =
      typeof raw['tipoEgreso'] === 'string' ? raw['tipoEgreso'] : 'DESPACHO_ORDINARIO';
    const fecha = typeof raw['fecha'] === 'string' ? raw['fecha'] : '';
    const estado = typeof raw['estado'] === 'string' ? raw['estado'] : '1';
    const total = typeof raw['total'] === 'number' ? raw['total'] : Number(raw['total']) || 0;

    const detalles = Array.isArray(raw['detalles']) ? raw['detalles'] : [];
    const totalItems = detalles.length > 0 ? detalles.length : 1;

    return {
      id,
      idCliente,
      nombreCliente,
      idEncargado: typeof raw['idEncargado'] === 'number' ? raw['idEncargado'] : null,
      nombreEncargado: typeof raw['nombreEncargado'] === 'string' ? raw['nombreEncargado'] : null,
      nombreEncargadoLibre:
        typeof raw['nombreEncargadoLibre'] === 'string' ? raw['nombreEncargadoLibre'] : null,
      idArea,
      nombreArea,
      idEncargadoAlmacen,
      nombreEncargadoAlmacen,
      idUsuario: typeof raw['idUsuario'] === 'number' ? raw['idUsuario'] : null,
      nombreUsuario:
        (typeof raw['nombreUsuario'] === 'string' && raw['nombreUsuario'].trim().length > 0
          ? raw['nombreUsuario'].trim()
          : null) ||
        (typeof raw['nombreEncargadoAlmacen'] === 'string' &&
        raw['nombreEncargadoAlmacen'].trim().length > 0
          ? raw['nombreEncargadoAlmacen'].trim()
          : null) ||
        'Almacén Central',
      ambiente: typeof raw['ambiente'] === 'string' ? raw['ambiente'] : null,
      prefijo,
      correlativo,
      numeroCompleto,
      tipoEgreso,
      fecha,
      estado,
      total,
      totalItems,
      totalArticulos: totalItems,
    };
  }

  /**
   * Normaliza un egreso completo junto con sus líneas de detalle.
   */
  private normalizarEgresoConDetalles(raw: Record<string, unknown>): EgresoConDetalles {
    const base = this.normalizarEgreso(raw);
    const rawDetalles = Array.isArray(raw['detalles'])
      ? (raw['detalles'] as Record<string, unknown>[])
      : [];

    let totalAcumulado = 0;
    const detalles: DetalleEgreso[] = rawDetalles.map((d) => {
      const cantidad = Number(d['cantidad']) || 0;
      const precio = Number(d['precio']) || 0;
      const subtotal = Number(d['subtotal']) || Math.round(cantidad * precio * 100) / 100;
      totalAcumulado += subtotal;

      const simbolo =
        typeof d['simboloUnidadMedida'] === 'string' ? d['simboloUnidadMedida'] : null;
      const permiteDec = typeof d['permiteDecimales'] === 'boolean' ? d['permiteDecimales'] : null;

      return {
        id: typeof d['id'] === 'number' ? d['id'] : undefined,
        idArticulo: Number(d['idArticulo']),
        codigoArticulo: String(d['codigoArticulo'] || ''),
        descripcionArticulo: String(d['descripcionArticulo'] || ''),
        numeroOrdenCompra:
          typeof d['numeroOrdenCompra'] === 'string' ? d['numeroOrdenCompra'] : null,
        cantidad,
        precio,
        subtotal,
        saldo: Number(d['saldo']) || 0,
        fecha: typeof d['fecha'] === 'string' ? d['fecha'] : undefined,
        tipo: typeof d['tipo'] === 'string' ? d['tipo'] : 'e',
        simboloUnidadMedida: simbolo,
        permiteDecimales: permiteDec,
      };
    });

    return {
      ...base,
      total: base.total > 0 ? base.total : totalAcumulado,
      totalItems: detalles.length,
      totalArticulos: detalles.length,
      detalles,
    };
  }

  /**
   * Carga catálogos activos y permite reintentar ante errores.
   */
  private fetchCatalog<T>(activeUrl: string, resetCache: () => void): Observable<T[]> {
    return this.http.get<unknown>(`${this.apiUrl}${activeUrl}`).pipe(
      map((res) => this.extractList<T>(res)),
      catchError((err) => {
        resetCache();
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  private extractList<T>(res: unknown): T[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    if (isPageResponse<T>(res)) return res.content;
    if (typeof res === 'object') {
      const data = getApiResponseData(res as ApiResponse<T[] | PageResponse<T>>);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (isPageResponse<T>(data)) return data.content;
    }
    return [];
  }
}
