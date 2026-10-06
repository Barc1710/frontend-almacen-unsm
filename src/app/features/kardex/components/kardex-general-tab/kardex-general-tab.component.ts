import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBookOpen,
  LucideCalendar,
  LucideClipboardList,
  LucideLoader2,
  LucideRefreshCw,
  LucideSearch,
  LucideUser,
} from '@lucide/angular';
import { NotificationService, obtenerFechaHoy } from '../../../../core';
import { PaginationComponent } from '../../../../shared/components';
import {
  KardexFiltros,
  KardexMovimiento,
  TIPO_MOVIMIENTO_BADGES,
  TipoMovimiento,
  TipoMovimientoBadgeConfig,
} from '../../models';
import { KardexService } from '../../services';

@Component({
  selector: 'app-kardex-general-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    PaginationComponent,
    LucideSearch,
    LucideRefreshCw,
    LucideCalendar,
    LucideUser,
    LucideLoader2,
    LucideBookOpen,
    LucideClipboardList,
  ],
  templateUrl: './kardex-general-tab.component.html',
})
export class KardexGeneralTabComponent implements OnInit {
  private readonly kardexService = inject(KardexService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emite el ID del artículo al presionar "Auditar" para navegar a la Pestaña 2 */
  readonly auditarArticulo = output<number>();

  // Estados de datos
  readonly cargando = signal(false);
  readonly errorListado = signal<string | null>(null);
  readonly movimientos = signal<KardexMovimiento[]>([]);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(0);
  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);

  // Filtros reactivos con patrón estándar del ERP
  readonly filtroTexto = signal<string>('');
  readonly tipoMovimientoFiltro = signal<string>('TODOS');
  readonly periodoFiltro = signal<'hoy' | 'todos' | 'intervalo'>('hoy');
  readonly fechaDesde = signal<string>(obtenerFechaHoy());
  readonly fechaHasta = signal<string>(obtenerFechaHoy());

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.cargando.set(true);
    this.errorListado.set(null);

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
      this.tipoMovimientoFiltro() !== 'TODOS'
        ? (this.tipoMovimientoFiltro() as TipoMovimiento)
        : undefined;

    const filtros: KardexFiltros = {
      desde: fechaInicio,
      hasta: fechaFin,
      tipoMovimiento: tipoFiltro,
    };

    this.kardexService
      .listarGeneral(filtros, this.paginaActual(), this.tamanioPagina())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          let content = page.content ?? [];

          // Búsqueda textual cliente complementaria (artículo, código, comprobante o responsable)
          const query = this.filtroTexto().trim().toLowerCase();
          if (query) {
            content = content.filter(
              (m) =>
                m.codigoArticulo?.toLowerCase().includes(query) ||
                m.descripcionArticulo?.toLowerCase().includes(query) ||
                m.documentoReferencia?.toLowerCase().includes(query) ||
                m.usuarioResponsable?.toLowerCase().includes(query),
            );
          }

          // Filtro por tipo de movimiento complementario
          if (tipoFiltro) {
            content = content.filter((m) => m.tipoMovimiento === tipoFiltro);
          }

          this.movimientos.set(content);
          this.totalElementos.set(page.totalElements ?? 0);
          this.totalPaginas.set(page.totalPages ?? 0);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          const mensaje =
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los movimientos de Kardex. Intente nuevamente.';
          this.errorListado.set(mensaje);
          this.notificationService.toast(mensaje, 'error');
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarMovimientos();
  }

  onCambioTipoMovimiento(tipo: string): void {
    this.tipoMovimientoFiltro.set(tipo);
    this.paginaActual.set(0);
    this.cargarMovimientos();
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
    this.cargarMovimientos();
  }

  onCambioFechas(): void {
    this.paginaActual.set(0);
    this.cargarMovimientos();
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
    this.periodoFiltro.set('hoy');
    this.fechaDesde.set(obtenerFechaHoy());
    this.fechaHasta.set(obtenerFechaHoy());
    this.tipoMovimientoFiltro.set('TODOS');
    this.paginaActual.set(0);
    this.cargarMovimientos();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarMovimientos();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarMovimientos();
  }

  irAAuditarArticulo(idArticulo: number): void {
    if (idArticulo) {
      this.auditarArticulo.emit(idArticulo);
    }
  }

  obtenerBadge(tipo: TipoMovimiento): TipoMovimientoBadgeConfig {
    return (
      TIPO_MOVIMIENTO_BADGES[tipo] ?? {
        label: tipo,
        badgeClass: 'bg-slate-100 text-slate-700',
      }
    );
  }
}
