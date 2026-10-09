import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideCircleAlert,
  LucideInbox,
  LucideLayers,
  LucideLoader2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash,
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { AuthService, NotificationService } from '../../../../core/services';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { FamiliaFormModalComponent } from '../../components/familia-form-modal/familia-form-modal.component';
import { FamiliaResponse } from '../../models';
import { FamiliaService } from '../../services';

@Component({
  selector: 'app-familias-list',
  imports: [
    FormsModule,
    PaginationComponent,
    FamiliaFormModalComponent,
    LucideLayers,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideLoader2,
    LucideInbox,
    LucideCircleAlert,
  ],
  templateUrl: './familias-list.component.html',
})
export class FamiliasListComponent implements OnInit {
  private readonly familiaService = inject(FamiliaService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly esAdmin = this.authService.isAdmin;
  readonly familias = signal<FamiliaResponse[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorCarga = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');

  readonly familiaSeleccionada = signal<FamiliaResponse | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarFamilias();
  }

  cargarFamilias(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.cargarSub = this.familiaService
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
            this.cargarFamilias();
            return;
          }
          this.familias.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorCarga.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No se pudo cargar el catálogo de familias. Error de conexión con el servidor.',
          );
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarFamilias();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.paginaActual.set(0);
    this.cargarFamilias();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarFamilias();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarFamilias();
  }

  abrirNuevo(): void {
    this.familiaSeleccionada.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(familia: FamiliaResponse): void {
    this.familiaSeleccionada.set(familia);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.familiaSeleccionada.set(null);
  }

  onGuardado(res: ApiResponse<FamiliaResponse>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Familia guardada con éxito';
    this.notificationService.toast(mensaje);
    this.cargarFamilias();
  }

  async eliminar(familia: FamiliaResponse): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const resultado = await this.notificationService.confirm({
      title: '¿Eliminar familia?',
      text: `¿Está seguro de eliminar la familia "${familia.nombre} (${familia.inicial})"?`,
      icon: 'warning',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      cancelButtonClass:
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
    });

    if (resultado.isConfirmed && !this.destroyRef.destroyed) {
      this.procesandoFilaId.set(familia.id);
      this.familiaService
        .eliminar(familia.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.procesandoFilaId.set(null)),
        )
        .subscribe({
          next: () => {
            this.notificationService.toast('Familia eliminada con éxito');
            this.cargarFamilias();
          },
          error: () => {
            this.notificationService.error(
              'Error al eliminar',
              'No se pudo eliminar la familia seleccionada.',
            );
          },
        });
    }
  }
}
