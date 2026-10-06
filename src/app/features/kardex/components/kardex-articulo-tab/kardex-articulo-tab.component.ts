import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideCalendar,
  LucideClipboardList,
  LucideFileSpreadsheet,
  LucideFileText,
  LucideLoader2,
  LucidePackage,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideSearch,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { NotificationService, obtenerFechaHoy } from '../../../../core';
import { PaginationComponent } from '../../../../shared/components';
import { Articulo, ArticuloResumen } from '../../../articulos/models';
import {
  KardexBalance,
  KardexFiltros,
  KardexMovimiento,
  TIPO_MOVIMIENTO_BADGES,
  TipoMovimiento,
  TipoMovimientoBadgeConfig,
} from '../../models';
import { KardexService } from '../../services';

@Component({
  selector: 'app-kardex-articulo-tab',
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    PaginationComponent,
    LucideSearch,
    LucideRefreshCw,
    LucideRotateCcw,
    LucideFileSpreadsheet,
    LucideFileText,
    LucidePackage,
    LucideCalendar,
    LucideUser,
    LucideLoader2,
    LucideClipboardList,
    LucideX,
  ],
  templateUrl: './kardex-articulo-tab.component.html',
})
export class KardexArticuloTabComponent implements OnInit {
  private readonly kardexService = inject(KardexService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Propagación de ID desde el contenedor principal (Deep linking o Tab 1) */
  readonly articuloIdProp = input<number | null>(null, { alias: 'articuloId' });

  /** Emite el ID seleccionado al contenedor para sincronizar query params */
  readonly articuloSeleccionadoChange = output<number | null>();

  // Artículo activo
  readonly articuloSeleccionado = signal<Articulo | ArticuloResumen | null>(null);
  readonly cargandoArticulo = signal(false);

  // Estados de datos del Kardex
  readonly cargandoKardex = signal(false);
  readonly errorListado = signal<string | null>(null);
  readonly movimientos = signal<KardexMovimiento[]>([]);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(0);
  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);

  // Filtros reactivos con patrón estándar del ERP (por defecto 'todos' para ver historial completo)
  readonly periodoFiltro = signal<'hoy' | 'todos' | 'intervalo'>('todos');
  readonly fechaDesde = signal<string>('');
  readonly fechaHasta = signal<string>('');

  // Buscador predictivo reactivo
  readonly busquedaQuery = signal<string>('');
  readonly resultadosBusqueda = signal<ArticuloResumen[]>([]);
  readonly buscandoPredictivo = signal(false);
  readonly dropdownAbierto = signal(false);

  private readonly searchSubject$ = new Subject<string>();

  // Determina si el artículo admite decimales
  readonly permiteDecimales = computed<boolean>(() => {
    return Boolean(this.articuloSeleccionado()?.permiteDecimales);
  });

  // Balance contable del periodo
  readonly balance = computed<KardexBalance>(() => {
    const movs = this.movimientos();
    const art = this.articuloSeleccionado();

    let totalEntradas = 0;
    let totalSalidas = 0;

    for (const m of movs) {
      totalEntradas += Number(m.entrada || 0);
      totalSalidas += Number(m.salida || 0);
    }

    let stockInicial = 0;
    if (movs.length > 0) {
      // Al estar ordenado DESC, el registro más antiguo de la lista cargada es el último elemento
      const ultimo = movs[movs.length - 1];
      stockInicial =
        Number(ultimo.saldoResultante || 0) -
        Number(ultimo.entrada || 0) +
        Number(ultimo.salida || 0);
    } else if (art) {
      stockInicial = Number(art.saldo || 0);
    }

    const saldoActual = art
      ? Number(art.saldo || 0)
      : movs.length > 0
        ? Number(movs[0].saldoResultante || 0)
        : 0;

    return {
      stockInicial,
      totalEntradas,
      totalSalidas,
      saldoActual,
    };
  });

  constructor() {
    // Sincronización reactiva si llega un ID por input/deep linking
    effect(() => {
      const id = this.articuloIdProp();
      if (id && id !== this.articuloSeleccionado()?.id) {
        this.seleccionarArticuloPorId(id);
      }
    });
  }

  ngOnInit(): void {
    this.searchSubject$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.trim().length < 2) {
            this.buscandoPredictivo.set(false);
            return [];
          }
          this.buscandoPredictivo.set(true);
          return this.kardexService.buscarArticulos(term);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (articulos) => {
          this.resultadosBusqueda.set(articulos);
          this.buscandoPredictivo.set(false);
          this.dropdownAbierto.set(
            articulos.length > 0 || this.busquedaQuery().trim().length >= 2,
          );
        },
        error: () => {
          this.buscandoPredictivo.set(false);
          this.resultadosBusqueda.set([]);
        },
      });
  }

  onInputBusqueda(texto: string): void {
    this.busquedaQuery.set(texto);
    if (!texto || texto.trim().length < 2) {
      this.resultadosBusqueda.set([]);
      this.dropdownAbierto.set(false);
    } else {
      this.searchSubject$.next(texto);
    }
  }

  seleccionarArticulo(art: ArticuloResumen): void {
    this.articuloSeleccionado.set(art);
    this.busquedaQuery.set('');
    this.dropdownAbierto.set(false);
    this.paginaActual.set(0);
    this.articuloSeleccionadoChange.emit(art.id);
    this.cargarKardexArticulo(art.id);
  }

  seleccionarArticuloPorId(id: number): void {
    this.cargandoArticulo.set(true);
    this.kardexService
      .obtenerArticuloPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (art) => {
          this.cargandoArticulo.set(false);
          if (art) {
            this.articuloSeleccionado.set(art);
            this.paginaActual.set(0);
            this.cargarKardexArticulo(art.id);
          } else {
            this.notificationService.toast('No se encontró información del artículo', 'warning');
          }
        },
        error: () => {
          this.cargandoArticulo.set(false);
          this.notificationService.toast('Error al consultar el artículo', 'error');
        },
      });
  }

  cargarKardexArticulo(idArticulo?: number): void {
    const id = idArticulo ?? this.articuloSeleccionado()?.id;
    if (!id) return;

    this.cargandoKardex.set(true);
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

    const filtros: KardexFiltros = {
      desde: fechaInicio,
      hasta: fechaFin,
    };

    this.kardexService
      .listarPorArticulo(id, filtros, this.paginaActual(), this.tamanioPagina())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.movimientos.set(page.content ?? []);
          this.totalElementos.set(page.totalElements ?? 0);
          this.totalPaginas.set(page.totalPages ?? 0);
          this.cargandoKardex.set(false);
        },
        error: (err: unknown) => {
          this.cargandoKardex.set(false);
          const msg =
            err instanceof Error
              ? err.message
              : 'Error al obtener el Kardex del artículo. Intente nuevamente.';
          this.errorListado.set(msg);
          this.notificationService.toast(msg, 'error');
        },
      });
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
    this.cargarKardexArticulo();
  }

  onCambioFechas(): void {
    this.paginaActual.set(0);
    this.cargarKardexArticulo();
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

  onRecargar(): void {
    if (this.articuloSeleccionado()?.id) {
      this.cargarKardexArticulo();
    }
  }

  limpiarArticuloSeleccionado(): void {
    this.articuloSeleccionado.set(null);
    this.movimientos.set([]);
    this.totalElementos.set(0);
    this.totalPaginas.set(0);
    this.paginaActual.set(0);
    this.periodoFiltro.set('todos');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.busquedaQuery.set('');
    this.dropdownAbierto.set(false);
    this.articuloSeleccionadoChange.emit(null);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarKardexArticulo();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarKardexArticulo();
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.dropdownAbierto.set(false);
    }, 200);
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
