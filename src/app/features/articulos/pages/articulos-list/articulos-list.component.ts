import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideBoxes,
  LucideChevronLeft,
  LucideChevronRight,
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
import Swal from 'sweetalert2';
import { ArticuloFormComponent } from '../../components/articulo-form/articulo-form.component';
import { Articulo, Familia, Marca, Ubicacion, UnidadMedida } from '../../models';
import { ArticuloService } from '../../services';

@Component({
  selector: 'app-articulos-list',
  imports: [
    FormsModule,
    ArticuloFormComponent,
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
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './articulos-list.component.html',
})
export class ArticulosListComponent implements OnInit {
  private readonly articuloService = inject(ArticuloService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal<boolean>(false);
  readonly articulos = signal<Articulo[]>([]);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);

  /**
   * Genera la lista concisa de números de páginas y elipsis para la navegación (1 2 ... última).
   */
  readonly paginasNumeros = computed<(number | string)[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual() + 1; // 1-indexed

    if (total <= 0) return [];
    if (total <= 3) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (actual <= 2) {
      return [1, 2, '...', total];
    }

    if (actual >= total - 1) {
      return [1, '...', total - 1, total];
    }

    return [1, '...', actual, '...', total];
  });

  // Filtros
  readonly filtroTexto = signal<string>('');
  readonly familiaFiltro = signal<number | null>(null);
  readonly estadoFiltro = signal<string>('1'); // '1' = Vigentes por defecto

  // Catálogos auxiliares activos
  readonly familias = signal<Familia[]>([]);
  readonly marcas = signal<Marca[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);
  readonly unidadesMedida = signal<UnidadMedida[]>([]);

  // Estado del modal de creación/edición
  readonly modalVisible = signal<boolean>(false);
  readonly articuloSeleccionado = signal<Articulo | null>(null);

  // Operaciones en curso
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarArticulos();
  }

  cargarCatalogos(): void {
    this.articuloService
      .listarFamiliasActivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.familias.set(data),
        error: () => this.familias.set([]),
      });

    this.articuloService
      .listarMarcasActivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.marcas.set(data),
        error: () => this.marcas.set([]),
      });

    this.articuloService
      .listarUbicacionesActivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.ubicaciones.set(data),
        error: () => this.ubicaciones.set([]),
      });

    this.articuloService
      .listarUnidadesMedidaActivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.unidadesMedida.set(data),
        error: () => this.unidadesMedida.set([]),
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

  irAPagina(pagina: number | string): void {
    if (typeof pagina === 'number') {
      this.cambiarPagina(pagina - 1);
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarArticulos();
  }

  abrirNuevo(): void {
    this.articuloSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(articulo: Articulo): void {
    this.articuloSeleccionado.set(articulo);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.articuloSeleccionado.set(null);
  }

  onArticuloGuardado(_guardado: Articulo): void {
    this.cerrarModal();
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Artículo guardado con éxito',
      showConfirmButton: false,
      timer: 3000,
    });
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
        void Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: actualizado.activo ? 'Artículo activado' : 'Artículo desactivado',
          showConfirmButton: false,
          timer: 2500,
        });
      },
      error: () => {
        this.procesandoFilaId.set(null);
        void Swal.fire({
          icon: 'error',
          title: 'Error de operación',
          text: 'No se pudo alternar la operatividad del artículo.',
          confirmButtonText: 'Entendido',
          customClass: {
            confirmButton:
              'bg-unsm-green text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-95',
          },
          buttonsStyling: false,
        });
      },
    });
  }

  async darDeBaja(articulo: Articulo): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const tieneStock = (articulo.saldo ?? 0) > 0;
    const cantidadFormateada = this.formatCantidad(articulo.saldo, articulo.permiteDecimales);
    const unidad = articulo.simboloUnidadMedida ? ` ${articulo.simboloUnidadMedida}` : '';

    const resultado = await Swal.fire({
      title: '¿Dar de baja artículo?',
      text: tieneStock
        ? `¡ADVERTENCIA! Este artículo aún cuenta con existencias (${cantidadFormateada}${unidad}). ¿Desea darlo de baja de todos modos?`
        : `El artículo "${articulo.codigo} - ${articulo.descripcion}" pasará a estado inactivo.`,
      icon: tieneStock ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      focusCancel: tieneStock,
      customClass: {
        confirmButton:
          'bg-unsm-red text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-90 ml-2',
        cancelButton:
          'bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-medium mr-2',
      },
      buttonsStyling: false,
    });

    if (resultado.isConfirmed) {
      this.procesandoFilaId.set(articulo.id);
      this.articuloService.eliminar(articulo.id).subscribe({
        next: () => {
          this.procesandoFilaId.set(null);
          void Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Artículo dado de baja',
            showConfirmButton: false,
            timer: 3000,
          });
          this.cargarArticulos();
        },
        error: () => {
          this.procesandoFilaId.set(null);
          void Swal.fire({
            icon: 'error',
            title: 'Error al dar de baja',
            text: 'No se pudo desactivar el artículo en el sistema.',
            confirmButtonText: 'Entendido',
            customClass: {
              confirmButton:
                'bg-unsm-green text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-95',
            },
            buttonsStyling: false,
          });
        },
      });
    }
  }

  isStockCritico(articulo: Articulo): boolean {
    return Number(articulo.saldo ?? 0) <= Number(articulo.cantidadMinima ?? 0);
  }

  isSinStock(articulo: Articulo): boolean {
    return Number(articulo.saldo ?? 0) <= 0;
  }

  isStockBajo(articulo: Articulo): boolean {
    const saldo = Number(articulo.saldo ?? 0);
    return saldo > 0 && this.isStockCritico(articulo);
  }

  formatCantidad(
    valor: number | null | undefined,
    permiteDecimales: boolean | null | undefined,
  ): string {
    const num = Number(valor ?? 0);
    if (permiteDecimales) {
      return num.toLocaleString('es-PE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    return Math.floor(num).toLocaleString('es-PE');
  }

  formatPrecio(valor: number | null | undefined): string {
    const num = Number(valor ?? 0);
    return `S/ ${num.toFixed(2)}`;
  }
}
