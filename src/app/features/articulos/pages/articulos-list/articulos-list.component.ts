import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBoxes,
  LucideLoader2,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideToggleLeft,
  LucideToggleRight,
  LucideTrash,
  LucideTriangleAlert,
} from '@lucide/angular';
import { catchError, forkJoin, of } from 'rxjs';
import { NotificationService } from '../../../../core';
import { PaginationComponent } from '../../../../shared';
import { ArticuloFormComponent } from '../../components/articulo-form/articulo-form.component';
import { Articulo, Familia, Marca, Ubicacion, UnidadMedida } from '../../models';
import { ArticuloService } from '../../services';

@Component({
  selector: 'app-articulos-list',
  imports: [
    FormsModule,
    ArticuloFormComponent,
    PaginationComponent,
    LucideBoxes,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideToggleLeft,
    LucideToggleRight,
    LucideTriangleAlert,
    LucidePackage,
    LucideLoader2,
  ],
  templateUrl: './articulos-list.component.html',
})
export class ArticulosListComponent implements OnInit {
  private readonly articuloService = inject(ArticuloService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly articulos = signal<Articulo[]>([]);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(0);
  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);

  readonly filtroTexto = signal('');
  readonly familiaFiltro = signal<number | null>(null);
  readonly estadoFiltro = signal('1');

  readonly familias = signal<Familia[]>([]);
  readonly marcas = signal<Marca[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);
  readonly unidadesMedida = signal<UnidadMedida[]>([]);

  readonly modalVisible = signal(false);
  readonly articuloSeleccionado = signal<Articulo | null>(null);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarArticulos();
  }

  cargarCatalogos(): void {
    forkJoin({
      familias: this.articuloService.listarFamiliasActivas().pipe(catchError(() => of([]))),
      marcas: this.articuloService.listarMarcasActivas().pipe(catchError(() => of([]))),
      ubicaciones: this.articuloService.listarUbicacionesActivas().pipe(catchError(() => of([]))),
      unidadesMedida: this.articuloService
        .listarUnidadesMedidaActivas()
        .pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ familias, marcas, ubicaciones, unidadesMedida }) => {
        this.familias.set(familias);
        this.marcas.set(marcas);
        this.ubicaciones.set(ubicaciones);
        this.unidadesMedida.set(unidadesMedida);
      });
  }

  cargarArticulos(): void {
    this.cargando.set(true);

    this.articuloService
      .listar({
        filtro: this.filtroTexto(),
        idFamilia: this.familiaFiltro(),
        estado: this.estadoFiltro() || undefined,
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'id,desc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.content.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarArticulos();
            return;
          }
          this.articulos.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.cargando.set(false);
        },
        error: () => {
          this.articulos.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  onCambioFamilia(id: number | null): void {
    this.familiaFiltro.set(id);
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  onCambioEstado(estado: string): void {
    this.estadoFiltro.set(estado);
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.familiaFiltro.set(null);
    this.estadoFiltro.set('1');
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarArticulos();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  abrirNuevo(): void {
    if (
      this.familias().length === 0 ||
      this.marcas().length === 0 ||
      this.ubicaciones().length === 0
    ) {
      this.cargarCatalogos();
    }
    this.articuloSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(articulo: Articulo): void {
    if (
      this.familias().length === 0 ||
      this.marcas().length === 0 ||
      this.ubicaciones().length === 0
    ) {
      this.cargarCatalogos();
    }
    this.articuloSeleccionado.set(articulo);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.articuloSeleccionado.set(null);
  }

  onArticuloGuardado(_guardado: Articulo): void {
    this.cerrarModal();
    this.notificationService.toast('Artículo guardado con éxito');
    this.cargarArticulos();
  }

  toggleActivo(articulo: Articulo): void {
    if (this.procesandoFilaId() !== null) return;
    this.procesandoFilaId.set(articulo.id);

    this.articuloService.toggleActivo(articulo.id).subscribe({
      next: (actualizado) => {
        this.procesandoFilaId.set(null);
        this.articulos.update((items) =>
          items.map((it) => (it.id === actualizado.id ? actualizado : it)),
        );
        this.notificationService.toast(
          actualizado.activo ? 'Artículo activado' : 'Artículo desactivado',
        );
      },
      error: () => {
        this.procesandoFilaId.set(null);
        this.notificationService.error(
          'Error de operación',
          'No se pudo alternar la operatividad del artículo.',
        );
      },
    });
  }

  async darDeBaja(articulo: Articulo): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const tieneStock = (articulo.saldo ?? 0) > 0;
    const cantidadFormateada = this.formatCantidad(articulo.saldo, articulo.permiteDecimales);
    const unidad = articulo.simboloUnidadMedida ? ` ${articulo.simboloUnidadMedida}` : '';

    const resultado = await this.notificationService.confirm({
      title: '¿Dar de baja artículo?',
      text: tieneStock
        ? `¡ADVERTENCIA! Este artículo aún cuenta con existencias (${cantidadFormateada}${unidad}). ¿Desea darlo de baja de todos modos?`
        : `El artículo "${articulo.codigo} - ${articulo.descripcion}" pasará a estado inactivo.`,
      icon: tieneStock ? 'warning' : 'question',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      focusCancel: tieneStock,
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90 ml-2 cursor-pointer',
      cancelButtonClass:
        'bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-medium mr-2 cursor-pointer',
    });

    if (resultado.isConfirmed) {
      this.procesandoFilaId.set(articulo.id);
      this.articuloService.eliminar(articulo.id).subscribe({
        next: () => {
          this.procesandoFilaId.set(null);
          this.notificationService.toast('Artículo dado de baja');
          this.cargarArticulos();
        },
        error: () => {
          this.procesandoFilaId.set(null);
          this.notificationService.error(
            'Error al dar de baja',
            'No se pudo desactivar el artículo en el sistema.',
          );
        },
      });
    }
  }

  isSinStock(articulo: Articulo): boolean {
    return Number(articulo.saldo ?? 0) <= 0;
  }

  isStockBajo(articulo: Articulo): boolean {
    const saldo = Number(articulo.saldo ?? 0);
    return saldo > 0 && saldo <= Number(articulo.cantidadMinima ?? 0);
  }

  formatCantidad(
    valor: number | null | undefined,
    permiteDecimales: boolean | null | undefined,
  ): string {
    const num = Number(valor ?? 0);
    return permiteDecimales
      ? num.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : Math.floor(num).toLocaleString('es-PE');
  }
}
