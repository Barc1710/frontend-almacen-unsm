import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBan,
  LucideCalendar,
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucideFileDown,
  LucideLoader2,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTruck,
  LucideUser,
} from '@lucide/angular';
import { catchError, of } from 'rxjs';
import Swal from 'sweetalert2';
import {
  IngresoDetalleModalComponent,
  IngresoFormModalComponent,
} from '../../components';
import { Ingreso, IngresoConDetalles, Proveedor } from '../../models';
import { IngresoService } from '../../services';

@Component({
  selector: 'app-ingresos-list',
  imports: [
    FormsModule,
    DatePipe,
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
    LucideChevronLeft,
    LucideChevronRight,
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
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal<boolean>(false);
  readonly ingresos = signal<Ingreso[]>([]);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);

  readonly periodoFiltro = signal<'hoy' | 'todos' | 'intervalo'>('hoy');
  readonly fechaDesde = signal<string>(this.obtenerFechaHoy());
  readonly fechaHasta = signal<string>(this.obtenerFechaHoy());
  readonly proveedorFiltro = signal<number | null>(null);
  readonly filtroTexto = signal<string>('');

  readonly proveedores = signal<Proveedor[]>([]);

  readonly modalRegistroVisible = signal<boolean>(false);
  readonly modalDetalleVisible = signal<boolean>(false);
  readonly ingresoDetalle = signal<IngresoConDetalles | null>(null);
  readonly cargandoDetalleId = signal<number | null>(null);
  readonly anulandoId = signal<number | null>(null);

  /**
   * Genera la navegación numérica con elipsis para la tabla de ingresos.
   */
  readonly paginasNumeros = computed<(number | string)[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual() + 1;

    if (total <= 0) return [];
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (actual <= 3) return [1, 2, 3, '...', total];
    if (actual >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', actual, '...', total];
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarIngresos();
  }

  cargarCatalogos(): void {
    this.ingresoService
      .listarProveedoresActivos()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((provs) => {
        this.proveedores.set(provs);
      });
  }

  cargarIngresos(): void {
    this.cargando.set(true);

    let fechaInicio: string | undefined = undefined;
    let fechaFin: string | undefined = undefined;

    if (this.periodoFiltro() === 'hoy') {
      const hoy = this.obtenerFechaHoy();
      fechaInicio = hoy;
      fechaFin = hoy;
    } else if (this.periodoFiltro() === 'intervalo') {
      fechaInicio = this.fechaDesde() || undefined;
      fechaFin = this.fechaHasta() || undefined;
    }

    this.ingresoService
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
      this.fechaDesde.set(this.obtenerFechaHoy());
      this.fechaHasta.set(this.obtenerFechaHoy());
    } else if (periodo === 'todos') {
      this.fechaDesde.set('');
      this.fechaHasta.set('');
    } else if (periodo === 'intervalo') {
      if (!this.fechaDesde()) this.fechaDesde.set(this.obtenerFechaHoy());
      if (!this.fechaHasta()) this.fechaHasta.set(this.obtenerFechaHoy());
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
    this.fechaDesde.set(this.obtenerFechaHoy());
    this.fechaHasta.set(this.obtenerFechaHoy());
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

  irAPagina(pagina: number | string): void {
    if (typeof pagina === 'number') {
      this.cambiarPagina(pagina - 1);
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarIngresos();
  }

  abrirNuevoIngreso(): void {
    this.modalRegistroVisible.set(true);
  }

  cerrarModalRegistro(): void {
    this.modalRegistroVisible.set(false);
  }

  onIngresoGuardado(_guardado: IngresoConDetalles): void {
    this.cerrarModalRegistro();
    this.showToast('Ingreso registrado con éxito');
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
        this.showError(
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

  descargarPdf(ingreso: Ingreso): void {
    this.showToast(`Comprobante ${ingreso.numeroOrden} preparado`);
  }

  anularIngreso(ingreso: Ingreso): void {
    if (ingreso.estado === '0' || this.anulandoId() !== null) {
      return;
    }

    void Swal.fire({
      title: '¿Anular comprobante?',
      text: `¿Desea anular el ingreso ${ingreso.numeroOrden}? Se revertirán las existencias en almacén.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton:
          'bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-xs transition-colors cursor-pointer',
        cancelButton:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 transition-colors cursor-pointer',
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        this.anulandoId.set(ingreso.id);
        this.ingresoService.anular(ingreso.id).subscribe({
          next: () => {
            this.anulandoId.set(null);
            this.showToast('Comprobante anulado y existencias revertidas con éxito');
            this.cargarIngresos();
          },
          error: (err: unknown) => {
            this.anulandoId.set(null);
            const mensaje = this.extraerMensaje(err, 'No fue posible anular el comprobante.');
            this.showError('No se pudo anular el ingreso', mensaje);
          },
        });
      }
    });
  }

  private obtenerFechaHoy(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private showToast(title: string): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 2500,
    });
  }

  private showError(title: string, text: string): void {
    void Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Entendido',
      customClass: {
        confirmButton:
          'bg-unsm-green text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-95',
      },
      buttonsStyling: false,
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
