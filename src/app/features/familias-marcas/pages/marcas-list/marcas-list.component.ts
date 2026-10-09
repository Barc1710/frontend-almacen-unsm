import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideCircleAlert,
  LucideInbox,
  LucideLoader2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTags,
  LucideTrash,
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { AuthService, NotificationService } from '../../../../core/services';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { MarcaFormModalComponent } from '../../components/marca-form-modal/marca-form-modal.component';
import { MarcaResponse } from '../../models';
import { MarcaService } from '../../services';

@Component({
  selector: 'app-marcas-list',
  imports: [
    FormsModule,
    PaginationComponent,
    MarcaFormModalComponent,
    LucideTags,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideLoader2,
    LucideInbox,
    LucideCircleAlert,
  ],
  templateUrl: './marcas-list.component.html',
})
export class MarcasListComponent implements OnInit {
  private readonly marcaService = inject(MarcaService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly esAdmin = this.authService.isAdmin;
  readonly marcas = signal<MarcaResponse[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorCarga = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');

  readonly marcaSeleccionada = signal<MarcaResponse | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarMarcas();
  }

  cargarMarcas(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.cargarSub = this.marcaService
      .listar({
        filtro: this.filtroTexto(),
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'id,asc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.content.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarMarcas();
            return;
          }
          this.marcas.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorCarga.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No se pudo cargar el catálogo de marcas. Error de conexión con el servidor.',
          );
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarMarcas();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.paginaActual.set(0);
    this.cargarMarcas();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarMarcas();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarMarcas();
  }

  abrirNuevo(): void {
    this.marcaSeleccionada.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(marca: MarcaResponse): void {
    this.marcaSeleccionada.set(marca);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.marcaSeleccionada.set(null);
  }

  onGuardado(res: ApiResponse<MarcaResponse>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Marca guardada con éxito';
    this.notificationService.toast(mensaje);
    this.cargarMarcas();
  }

  async eliminar(marca: MarcaResponse): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const resultado = await this.notificationService.confirm({
      title: '¿Eliminar marca?',
      text: `¿Está seguro de eliminar la marca "${marca.nombre}"?`,
      icon: 'warning',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      cancelButtonClass:
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
    });

    if (resultado.isConfirmed && !this.destroyRef.destroyed) {
      this.procesandoFilaId.set(marca.id);
      this.marcaService
        .eliminar(marca.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.procesandoFilaId.set(null)),
        )
        .subscribe({
          next: () => {
            this.notificationService.toast('Marca eliminada con éxito');
            this.cargarMarcas();
          },
          error: () => {
            this.notificationService.error(
              'Error al eliminar',
              'No se pudo eliminar la marca seleccionada.',
            );
          },
        });
    }
  }
}
