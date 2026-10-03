import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBan,
  LucideCalendar,
  LucideEye,
  LucideLoader2,
  LucidePackageCheck,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideUser,
} from '@lucide/angular';
import { forkJoin, Subscription } from 'rxjs';
import { AuthService, NotificationService, obtenerFechaHoy } from '../../../../core';
import { PaginationComponent } from '../../../../shared';
import { EgresoDetalleModalComponent, EgresoFormModalComponent } from '../../components';
import {
  Area,
  Cliente,
  Egreso,
  EgresoConDetalles,
  Encargado,
  EncargadoAlmacen,
  TipoEgreso,
} from '../../models';
import { EgresoService } from '../../services';

@Component({
  selector: 'app-egresos-list',
  imports: [
    FormsModule,
    DatePipe,
    TitleCasePipe,
    PaginationComponent,
    EgresoFormModalComponent,
    EgresoDetalleModalComponent,
    LucidePackageCheck,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucideEye,
    LucideBan,
    LucideLoader2,
    LucideCalendar,
    LucideUser,
  ],
  templateUrl: './egresos-list.component.html',
  styles: `
    input[type='date'] {
      cursor: pointer;
    }
    input[type='date']::-webkit-calendar-picker-indicator {
      cursor: pointer;
      margin-top: auto;
      margin-bottom: auto;
      vertical-align: middle;
      font-size: 15px;
      opacity: 0.8;
    }
    input[type='date']:disabled {
      cursor: not-allowed;
    }
    input[type='date']:disabled::-webkit-calendar-picker-indicator {
      cursor: not-allowed;
      opacity: 0.4;
      pointer-events: none;
    }
  `,
})
export class EgresosListComponent implements OnInit {
  readonly esAdministrador = inject(AuthService).isAdmin;
  private consultaEgresos?: Subscription;
  readonly errorListado = signal<string | null>(null);
  readonly errorCatalogos = signal<string | null>(null);
  readonly cargandoCatalogos = signal(false);
  private readonly egresoService = inject(EgresoService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal<boolean>(false);
  readonly egresos = signal<Egreso[]>([]);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);

  // Filtros
  readonly filtroTexto = signal<string>('');
  readonly tipoEgresoFiltro = signal<string>('TODOS');
  readonly periodoFiltro = signal<'hoy' | 'todos' | 'intervalo'>('hoy');
  readonly fechaDesde = signal<string>(obtenerFechaHoy());
  readonly fechaHasta = signal<string>(obtenerFechaHoy());

  // Catálogos para los modales
  readonly clientes = signal<Cliente[]>([]);
  readonly areas = signal<Area[]>([]);
  readonly encargados = signal<Encargado[]>([]);
  readonly encargadosAlmacen = signal<EncargadoAlmacen[]>([]);

  // Modales
  readonly modalRegistroVisible = signal<boolean>(false);
  readonly modalDetalleVisible = signal<boolean>(false);
  readonly egresoDetalle = signal<EgresoConDetalles | null>(null);
  readonly cargandoDetalleId = signal<number | null>(null);
  readonly anulandoId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarEgresos();
  }

  cargarCatalogos(): void {
    if (this.cargandoCatalogos()) return;
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    forkJoin({
      clientes: this.egresoService.listarClientesActivos(),
      areas: this.egresoService.listarAreasActivas(),
      encargados: this.egresoService.listarEncargadosActivos(),
      encargadosAlmacen: this.egresoService.listarEncargadosAlmacenActivos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalogos) => {
          this.clientes.set(catalogos.clientes);
          this.areas.set(catalogos.areas);
          this.encargados.set(catalogos.encargados);
          this.encargadosAlmacen.set(catalogos.encargadosAlmacen);
          this.cargandoCatalogos.set(false);
        },
        error: () => {
          this.cargandoCatalogos.set(false);
          this.errorCatalogos.set(
            'No se pudieron cargar los datos necesarios para registrar un egreso.',
          );
        },
      });
  }

  cargarEgresos(): void {
    this.consultaEgresos?.unsubscribe();
    this.errorListado.set(null);
    this.cargando.set(true);

    let fechaInicio: string | undefined = undefined;
    let fechaFin: string | undefined = undefined;

    if (this.periodoFiltro() === 'hoy') {
      const hoy = obtenerFechaHoy();
      fechaInicio = hoy;
      fechaFin = hoy;
    } else if (this.periodoFiltro() === 'intervalo') {
      fechaInicio = this.fechaDesde() || undefined;
      fechaFin = this.fechaHasta() || undefined;
    }

    const tipoFiltro =
      this.tipoEgresoFiltro() !== 'TODOS' ? (this.tipoEgresoFiltro() as TipoEgreso) : undefined;

    this.consultaEgresos = this.egresoService
      .listar({
        filtro: this.filtroTexto() || undefined,
        tipoEgreso: tipoFiltro,
        fechaInicio,
        fechaFin,
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'fecha,desc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.content.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarEgresos();
            return;
          }
          this.egresos.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.cargando.set(false);
        },
        error: () => {
          this.errorListado.set('No se pudieron cargar los egresos. Intente nuevamente.');
          this.egresos.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  onCambioTipoEgreso(tipo: string): void {
    this.tipoEgresoFiltro.set(tipo);
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  onCambioPeriodo(periodo: 'hoy' | 'todos' | 'intervalo'): void {
    this.periodoFiltro.set(periodo);
    if (periodo === 'hoy') {
      this.fechaDesde.set(obtenerFechaHoy());
      this.fechaHasta.set(obtenerFechaHoy());
    } else if (periodo === 'todos') {
      this.fechaDesde.set('');
      this.fechaHasta.set('');
    } else if (periodo === 'intervalo') {
      if (!this.fechaDesde()) this.fechaDesde.set(obtenerFechaHoy());
      if (!this.fechaHasta()) this.fechaHasta.set(obtenerFechaHoy());
    }
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  onCambioFechas(): void {
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  abrirSelectorFecha(event: MouseEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.disabled) return;
    try {
      input.showPicker();
    } catch {
      // Ignorar si el navegador no soporta showPicker
    }
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.tipoEgresoFiltro.set('TODOS');
    this.periodoFiltro.set('hoy');
    this.fechaDesde.set(obtenerFechaHoy());
    this.fechaHasta.set(obtenerFechaHoy());
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarEgresos();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarEgresos();
  }

  abrirNuevoDespacho(): void {
    if (this.cargandoCatalogos() || this.errorCatalogos()) return;
    this.modalRegistroVisible.set(true);
  }

  cerrarModalRegistro(): void {
    this.modalRegistroVisible.set(false);
  }

  onDespachoGuardado(_guardado: EgresoConDetalles): void {
    this.cerrarModalRegistro();
    this.notificationService.toast('Despacho registrado con éxito');
    this.cargarEgresos();
  }

  verDetalle(egreso: Egreso): void {
    if (this.cargandoDetalleId() !== null) return;
    this.cargandoDetalleId.set(egreso.id);

    this.egresoService.obtenerPorId(egreso.id).subscribe({
      next: (detalleCompleto) => {
        this.cargandoDetalleId.set(null);
        this.egresoDetalle.set(detalleCompleto);
        this.modalDetalleVisible.set(true);
      },
      error: () => {
        this.cargandoDetalleId.set(null);
        this.notificationService.error(
          'Error de consulta',
          'No se pudo cargar el detalle del despacho solicitado.',
        );
      },
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible.set(false);
    this.egresoDetalle.set(null);
  }

  anularDespacho(egreso: Egreso): void {
    if (!this.esAdministrador() || egreso.estado === '0' || this.anulandoId() !== null) {
      return;
    }

    void this.notificationService
      .confirm({
        title: '¿Anular comprobante?',
        text: `¿Desea anular el comprobante ${egreso.numeroCompleto}? Se revertirán las cantidades despachadas al stock general del almacén.`,
        icon: 'warning',
        confirmButtonText: 'Sí, anular comprobante',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-xs transition-colors cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 transition-colors cursor-pointer',
      })
      .then((result) => {
        if (result.isConfirmed) {
          this.anulandoId.set(egreso.id);
          this.egresoService.anular(egreso.id).subscribe({
            next: () => {
              this.anulandoId.set(null);
              this.notificationService.toast(
                'Comprobante anulado y existencias restituidas al inventario con éxito',
              );
              this.cargarEgresos();
            },
            error: (err: unknown) => {
              this.anulandoId.set(null);
              const mensaje = this.extraerMensaje(
                err,
                'No fue posible anular el comprobante de despacho.',
              );
              this.notificationService.error('No se pudo anular', mensaje);
            },
          });
        }
      });
  }

  private extraerMensaje(errorBody: unknown, fallback: string): string {
    if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
      return errorBody;
    }
    if (typeof errorBody === 'object' && errorBody !== null) {
      const errorObj = errorBody as { error?: unknown; message?: string; mensaje?: string };
      if (errorObj.error) {
        return this.extraerMensaje(errorObj.error, fallback);
      }
      return errorObj.mensaje || errorObj.message || fallback;
    }
    return fallback;
  }
}
