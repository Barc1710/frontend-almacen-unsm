import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiResponseData,
  isPageResponse,
  PageResponse,
} from '../../../core/models';
import { Articulo } from '../../articulos/models';
import {
  Ingreso,
  IngresoConDetalles,
  IngresoCreateRequest,
  IngresoFiltros,
  Proveedor,
} from '../models';

@Service()
export class IngresoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private proveedoresCache$?: Observable<Proveedor[]>;

  private articulosCache$?: Observable<Articulo[]>;

  /**
   * Consulta paginada de comprobantes de ingreso con soporte para filtros por fecha y proveedor.
   */
  listar(filtros: IngresoFiltros = {}): Observable<PageResponse<Ingreso>> {
    let params = new HttpParams();

    const append = (key: string, val: string | number | undefined | null) => {
      if (val !== undefined && val !== null) {
        const text = String(val).trim();
        if (text) params = params.set(key, text);
      }
    };

    append('filtro', filtros.filtro);
    append('numeroOrden', filtros.numeroOrden);
    append('idProveedor', filtros.idProveedor);
    append('fechaInicio', filtros.fechaInicio || filtros.desde);
    append('fechaFin', filtros.fechaFin || filtros.hasta);
    append('desde', filtros.desde || filtros.fechaInicio);
    append('hasta', filtros.hasta || filtros.fechaFin);
    append('sort', filtros.sort || 'id,desc');

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString()).set('size', size.toString());

    return this.http.get<unknown>(`${this.apiUrl}/ingresos`, { params }).pipe(
      map((response) => {
        let pageData: PageResponse<unknown> | undefined;

        if (isPageResponse<unknown>(response)) {
          pageData = response;
        } else if (typeof response === 'object' && response !== null) {
          pageData = getApiResponseData(response as ApiResponse<PageResponse<unknown>>);
        }

        if (pageData && Array.isArray(pageData.content)) {
          const contentNormalizado = pageData.content.map((item) =>
            this.normalizarIngreso(item as Record<string, unknown>),
          );
          return {
            ...pageData,
            content: contentNormalizado,
          } as PageResponse<Ingreso>;
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
   * Obtiene la información completa de un comprobante de ingreso junto con sus artículos recepcionados.
   */
  obtenerPorId(id: number): Observable<IngresoConDetalles> {
    return this.http.get<unknown>(`${this.apiUrl}/ingresos/${id}`).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<string, unknown>;
          if (data && typeof data === 'object') {
            return this.normalizarIngresoConDetalles(data);
          }
        }
        throw new Error('Comprobante de ingreso no encontrado');
      }),
    );
  }

  /**
   * Anula un comprobante de ingreso revirtiendo el stock recepcionado en almacén.
   */
  anular(id: number): Observable<IngresoConDetalles> {
    return this.http.post<unknown>(`${this.apiUrl}/ingresos/${id}/anular`, {}).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<string, unknown>;
          if (data && typeof data === 'object') {
            return this.normalizarIngresoConDetalles(data);
          }
        }
        throw new Error('Error al anular el comprobante de ingreso');
      }),
    );
  }

  /**
   * Registra transaccionalmente un nuevo ingreso con sus detalles de artículos.
   * Envía siempre precio en 0 según requerimiento.
   */
  crear(request: IngresoCreateRequest): Observable<IngresoConDetalles> {
    const payload = {
      idProveedor: request.idProveedor,
      numeroOrdenCompra: (request.numeroOrden || '').trim() || null,
      descripcion: (request.observacion || '').trim() || '',
      detalles: request.detalles.map((d) => ({
        idArticulo: d.idArticulo,
        cantidad: Number(d.cantidad) || 0,
        precio: 0, // Campo de precio se envía siempre en 0
      })),
    };

    return this.http.post<unknown>(`${this.apiUrl}/ingresos`, payload).pipe(
      map((res) => {
        if (typeof res === 'object' && res !== null) {
          const data = (getApiResponseData(res as ApiResponse<unknown>) || res) as Record<string, unknown>;
          if (data && typeof data === 'object') {
            return this.normalizarIngresoConDetalles(data);
          }
        }
        throw new Error('Error al registrar el comprobante de ingreso');
      }),
    );
  }

  /**
   * Obtiene el siguiente correlativo oficial de ingreso (ej. I26-0001).
   */
  obtenerSiguienteNumero(): Observable<string> {
    return this.http.get<unknown>(`${this.apiUrl}/ingresos/siguiente-correlativo`).pipe(
      map((res) => {
        if (typeof res === 'string') return res;
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<string>);
          if (typeof data === 'string') return data;
        }
        return '';
      }),
      catchError(() => of('')),
    );
  }

  /**
   * Verifica de manera preventiva si el número de orden de compra ya existe en el sistema.
   */
  verificarOrdenCompra(numeroOrden: string): Observable<boolean> {
    const orden = numeroOrden.trim();
    if (!orden) return of(false);

    const params = new HttpParams().set('numeroOrden', orden);
    return this.http.get<unknown>(`${this.apiUrl}/ingresos/existe-orden`, { params }).pipe(
      map((res) => {
        if (typeof res === 'boolean') return res;
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<boolean>);
          if (typeof data === 'boolean') return data;
          const cand = res as Record<string, unknown>;
          if (typeof cand['existe'] === 'boolean') return cand['existe'];
          if (typeof cand['duplicado'] === 'boolean') return cand['duplicado'];
        }
        return false;
      }),
      catchError(() => of(false)),
    );
  }

  /**
   * Obtiene el listado de proveedores activos con almacenamiento en memoria reactiva.
   */
  listarProveedoresActivos(): Observable<Proveedor[]> {
    return (this.proveedoresCache$ ??= this.fetchCatalog<Proveedor>(
      '/proveedores/activos',
      '/proveedores?size=200',
      () => {
        this.proveedoresCache$ = undefined;
      },
    ));
  }

  /**
   * Obtiene el catálogo de artículos activos para el selector con búsqueda predictiva.
   */
  listarArticulosActivos(): Observable<Articulo[]> {
    return (this.articulosCache$ ??= this.fetchCatalog<Articulo>(
      '/articulos?estado=1&size=500&sort=descripcion,asc',
      '/articulos?size=500',
      () => {
        this.articulosCache$ = undefined;
      },
    ));
  }

  /**
   * Busca artículos para el autocompletado en línea de las filas de recepción (soloConStock=false).
   */
  buscarArticulosParaIngreso(filtro: string): Observable<Articulo[]> {
    const query = filtro.trim();
    if (!query) return of([]);

    let params = new HttpParams()
      .set('filtro', query)
      .set('soloConStock', 'false')
      .set('estado', '1')
      .set('size', '15');

    return this.http.get<unknown>(`${this.apiUrl}/articulos`, { params }).pipe(
      map((res) => this.extractList<Articulo>(res)),
      catchError(() => of([])),
    );
  }

  /**
   * Normaliza los datos de un ingreso para consumo uniforme en la UI.
   */
  private normalizarIngreso(raw: Record<string, unknown>): Ingreso {
    const rawNumeroCompleto = typeof raw['numeroCompleto'] === 'string' ? raw['numeroCompleto'] : null;
    const prefijo = typeof raw['prefijo'] === 'string' ? raw['prefijo'] : null;
    const correlativo = typeof raw['correlativo'] === 'number' ? raw['correlativo'] : null;
    const numeroOrdenCompra = typeof raw['numeroOrdenCompra'] === 'string' ? raw['numeroOrdenCompra'] : null;
    const rawNumeroOrden = typeof raw['numeroOrden'] === 'string' ? raw['numeroOrden'] : null;

    const numeroCompleto =
      rawNumeroCompleto ||
      (prefijo && correlativo
        ? `${prefijo}-${String(correlativo).padStart(4, '0')}`
        : numeroOrdenCompra || rawNumeroOrden || '-');

    const totalItems = raw['totalItems'];
    const totalArticulos = raw['totalArticulos'];
    const detalles = raw['detalles'];

    const itemsCount =
      totalItems !== undefined && totalItems !== null
        ? Number(totalItems)
        : Array.isArray(detalles) && detalles.length > 0
          ? detalles.length
          : totalArticulos !== undefined && totalArticulos !== null
            ? Number(totalArticulos)
            : 1;

    const id = Number(raw['id']);
    const idProveedor = Number(raw['idProveedor']);
    const razonSocialProveedor = typeof raw['razonSocialProveedor'] === 'string' ? raw['razonSocialProveedor'] : null;
    const nombreProveedor = typeof raw['nombreProveedor'] === 'string' ? raw['nombreProveedor'] : null;
    const rucProveedor = typeof raw['rucProveedor'] === 'string' ? raw['rucProveedor'] : null;
    const fecha = typeof raw['fecha'] === 'string' ? raw['fecha'] : '';
    const idUsuario = typeof raw['idUsuario'] === 'number' ? raw['idUsuario'] : null;
    const nombreUsuario = typeof raw['nombreUsuario'] === 'string' ? raw['nombreUsuario'] : null;
    const usuarioRecepcion = typeof raw['usuarioRecepcion'] === 'string' ? raw['usuarioRecepcion'] : null;
    const descripcion = typeof raw['descripcion'] === 'string' ? raw['descripcion'] : null;
    const observacion = typeof raw['observacion'] === 'string' ? raw['observacion'] : null;
    const estado = typeof raw['estado'] === 'string' ? raw['estado'] : '1';
    const fechaCreacion = typeof raw['fechaCreacion'] === 'string' ? raw['fechaCreacion'] : fecha;

    return {
      id,
      numeroOrden: numeroCompleto,
      numeroCompleto: rawNumeroCompleto || numeroCompleto,
      prefijo,
      correlativo,
      numeroOrdenCompra,
      idProveedor,
      nombreProveedor: razonSocialProveedor || nombreProveedor || 'Proveedor no especificado',
      rucProveedor,
      fecha,
      idUsuario,
      usuarioRecepcion: nombreUsuario || usuarioRecepcion || 'Almacén Central',
      nombreUsuario: nombreUsuario || usuarioRecepcion || 'Almacén Central',
      totalItems: itemsCount,
      totalArticulos: itemsCount,
      totalImporte: 0,
      total: 0,
      observacion: descripcion || observacion || null,
      estado,
      fechaCreacion,
    };
  }

  /**
   * Normaliza un ingreso completo con su colección de artículos.
   */
  private normalizarIngresoConDetalles(raw: Record<string, unknown>): IngresoConDetalles {
    const base = this.normalizarIngreso(raw);
    const detallesRaw: Record<string, unknown>[] = Array.isArray(raw['detalles'])
      ? (raw['detalles'] as Record<string, unknown>[])
      : [];

    const unidadesDecimales = ['KG', 'KGM', 'L', 'LTR', 'GL', 'GLL', 'GAL', 'M', 'MTR', 'M2', 'MTK', 'M3'];
    const detalles = detallesRaw.map((d) => {
      const simbolo = String(d['simboloUnidadMedida'] || d['unidadMedida'] || d['simbolo'] || 'UND');
      const permiteDec =
        d['permiteDecimales'] === true ||
        (d['permiteDecimales'] !== false && unidadesDecimales.includes(simbolo.toUpperCase().trim()));

      return {
        id: typeof d['id'] === 'number' ? d['id'] : undefined,
        idArticulo: Number(d['idArticulo']),
        codigoArticulo: String(d['codigoArticulo'] || ''),
        descripcionArticulo: String(d['descripcionArticulo'] || ''),
        simboloUnidadMedida: simbolo,
        permiteDecimales: permiteDec,
        cantidad: Number(d['cantidad']) || 0,
        precioUnitario: 0, // Precios en 0
        subtotal: 0,       // Precios en 0
      };
    });

    return {
      ...base,
      totalItems: detalles.length > 0 ? detalles.length : base.totalItems,
      totalArticulos: detalles.length > 0 ? detalles.length : base.totalArticulos,
      totalImporte: 0,
      total: 0,
      detalles,
    };
  }

  /**
   * Carga catálogos auxiliares con fallback paginado y shareReplay resiliente ante errores.
   */
  private fetchCatalog<T>(
    activeUrl: string,
    fallbackUrl: string,
    resetCache: () => void,
  ): Observable<T[]> {
    return this.http.get<unknown>(`${this.apiUrl}${activeUrl}`).pipe(
      map((res) => this.extractList<T>(res)),
      catchError(() =>
        this.http
          .get<unknown>(`${this.apiUrl}${fallbackUrl}`)
          .pipe(map((res) => this.extractList<T>(res))),
      ),
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
