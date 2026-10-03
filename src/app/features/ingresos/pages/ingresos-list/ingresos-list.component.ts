import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBan,
  LucideCalendar,
  LucideEye,
  LucideFileDown,
  LucideLoader2,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTruck,
  LucideUser,
} from '@lucide/angular';
import { Subscription } from 'rxjs';
import { AuthService, NotificationService, obtenerFechaHoy } from '../../../../core';
import { PaginationComponent } from '../../../../shared';
import { IngresoDetalleModalComponent, IngresoFormModalComponent } from '../../components';
import { Ingreso, IngresoConDetalles, Proveedor } from '../../models';
import { IngresoService } from '../../services';

@Component({
  selector: 'app-ingresos-list',
  imports: [
    FormsModule,
    DatePipe,
    PaginationComponent,
    IngresoFormModalComponent,
    IngresoDetalleModalComponent,
    LucideTruck,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucideEye,
    LucideFileDown,
    LucideBan,
    LucideLoader2,
    LucideCalendar,
    LucideUser,
  ],
  templateUrl: './ingresos-list.component.html',
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
export class IngresosListComponent implements OnInit {
  private readonly ingresoService = inject(IngresoService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private consultaIngresos?: Subscription;

  readonly esAdministrador = computed(() => this.authService.isAdmin());
  readonly cargando = signal<boolean>(false);
  readonly errorListado = signal<string | null>(null);
  readonly cargandoCatalogos = signal<boolean>(false);
  readonly errorCatalogos = signal<string | null>(null);

  readonly ingresos = signal<Ingreso[]>([]);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);

  readonly periodoFiltro = signal<'hoy' | 'todos' | 'intervalo'>('hoy');
  readonly fechaDesde = signal<string>(obtenerFechaHoy());
  readonly fechaHasta = signal<string>(obtenerFechaHoy());
  readonly proveedorFiltro = signal<number | null>(null);
  readonly filtroTexto = signal<string>('');

  readonly proveedores = signal<Proveedor[]>([]);

  readonly modalRegistroVisible = signal<boolean>(false);
  readonly modalDetalleVisible = signal<boolean>(false);
  readonly ingresoDetalle = signal<IngresoConDetalles | null>(null);
  readonly cargandoDetalleId = signal<number | null>(null);
  readonly anulandoId = signal<number | null>(null);
  readonly descargandoPdfId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarIngresos();
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    this.ingresoService
      .listarProveedoresActivos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (provs) => {
          this.proveedores.set(provs);
          this.cargandoCatalogos.set(false);
        },
        error: () => {
          this.cargandoCatalogos.set(false);
          this.errorCatalogos.set(
            'No se pudieron cargar los datos necesarios para registrar un ingreso.',
          );
        },
      });
  }

  cargarIngresos(): void {
    this.consultaIngresos?.unsubscribe();
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

    this.consultaIngresos = this.ingresoService
      .listar({
        filtro: this.filtroTexto() || undefined,
        numeroOrden: this.filtroTexto() || undefined,
        idProveedor: this.proveedorFiltro(),
        fechaInicio,
        fechaFin,
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'id,desc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.content.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarIngresos();
            return;
          }
          this.ingresos.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.cargando.set(false);
        },
        error: () => {
          this.errorListado.set(
            'No se pudieron cargar los comprobantes de ingreso. Intente nuevamente.',
          );
          this.ingresos.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarIngresos();
  }

  onCambioProveedor(id: number | null): void {
    this.proveedorFiltro.set(id);
    this.paginaActual.set(0);
    this.cargarIngresos();
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
    this.cargarIngresos();
  }

  onCambioFechas(): void {
    this.paginaActual.set(0);
    this.cargarIngresos();
  }

  abrirSelectorFecha(event: MouseEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.disabled) return;
    try {
      input.showPicker();
    } catch {
      // Ignorar si el navegador no soporta showPicker o ya está abierto
    }
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.periodoFiltro.set('hoy');
    this.fechaDesde.set(obtenerFechaHoy());
    this.fechaHasta.set(obtenerFechaHoy());
    this.proveedorFiltro.set(null);
    this.paginaActual.set(0);
    this.cargarIngresos();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarIngresos();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarIngresos();
  }

  abrirNuevoIngreso(): void {
    if (this.cargandoCatalogos() || !!this.errorCatalogos()) return;
    this.modalRegistroVisible.set(true);
  }

  cerrarModalRegistro(): void {
    this.modalRegistroVisible.set(false);
  }

  onIngresoGuardado(_guardado: IngresoConDetalles): void {
    this.cerrarModalRegistro();
    this.notificationService.toast('Ingreso registrado con éxito');
    this.cargarIngresos();
  }

  verDetalle(ingreso: Ingreso): void {
    if (this.cargandoDetalleId() !== null) return;
    this.cargandoDetalleId.set(ingreso.id);

    this.ingresoService.obtenerPorId(ingreso.id).subscribe({
      next: (detalleCompleto) => {
        this.cargandoDetalleId.set(null);
        this.ingresoDetalle.set(detalleCompleto);
        this.modalDetalleVisible.set(true);
      },
      error: () => {
        this.cargandoDetalleId.set(null);
        this.notificationService.error(
          'Error de consulta',
          'No se pudo cargar el detalle del comprobante de ingreso.',
        );
      },
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible.set(false);
    this.ingresoDetalle.set(null);
  }

  abrirPdf(ingreso: Ingreso): void {
    if (this.descargandoPdfId() !== null) return;
    this.descargandoPdfId.set(ingreso.id);

    // Abrir una pestaña en blanco inmediatamente para evitar bloqueos del navegador
    const nuevaPestana = window.open('about:blank', '_blank');

    this.ingresoService.descargarPdf(ingreso.id).subscribe({
      next: (blob) => {
        this.descargandoPdfId.set(null);
        const file = new Blob([blob], { type: 'application/pdf' });
        const fileUrl = window.URL.createObjectURL(file);

        if (nuevaPestana && !nuevaPestana.closed) {
          nuevaPestana.location.href = fileUrl;
        } else {
          window.open(fileUrl, '_blank');
        }

        // Revocar la URL después de un minuto para liberar memoria
        setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
      },
      error: () => {
        this.descargandoPdfId.set(null);
        if (nuevaPestana && !nuevaPestana.closed) {
          nuevaPestana.close();
        }
        this.notificationService.error(
          'Error al abrir PDF',
          'No se pudo generar ni abrir el comprobante en formato PDF.',
        );
      },
    });
  }

  // Alias para mantener compatibilidad si se invoca como descargarPdf
  descargarPdf(ingreso: Ingreso): void {
    this.abrirPdf(ingreso);
  }

  anularIngreso(ingreso: Ingreso): void {
    if (ingreso.estado === '0' || this.anulandoId() !== null || !this.esAdministrador()) {
      return;
    }

    void this.notificationService
      .confirm({
        title: '¿Anular comprobante?',
        text: `¿Desea anular el ingreso ${ingreso.numeroOrden}? Se revertirán las existencias en almacén.`,
        icon: 'warning',
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-xs transition-colors cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 transition-colors cursor-pointer',
      })
      .then((result) => {
        if (result.isConfirmed) {
          this.anulandoId.set(ingreso.id);
          this.ingresoService.anular(ingreso.id).subscribe({
            next: () => {
              this.anulandoId.set(null);
              this.notificationService.toast(
                'Comprobante anulado y existencias revertidas con éxito',
              );
              this.cargarIngresos();
            },
            error: (err: unknown) => {
              this.anulandoId.set(null);
              const mensaje = this.extraerMensaje(err, 'No fue posible anular el comprobante.');
              this.notificationService.error('No se pudo anular el ingreso', mensaje);
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
