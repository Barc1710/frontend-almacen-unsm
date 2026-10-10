import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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
  LucideTrash,
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { EncargadoFormModalComponent } from '../encargado-form-modal/encargado-form-modal.component';
import { Encargado } from '../../models';
import { EncargadoService } from '../../services';

@Component({
  selector: 'app-encargados-tab',
  imports: [
    FormsModule,
    PaginationComponent,
    EncargadoFormModalComponent,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideLoader2,
    LucideInbox,
    LucideCircleAlert,
  ],
  templateUrl: './encargados-tab.component.html',
})
export class EncargadosTabComponent implements OnInit {
  private readonly encargadoService = inject(EncargadoService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly encargados = signal<Encargado[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorCarga = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');

  readonly encargadoSeleccionado = signal<Encargado | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarEncargados();
  }

  cargarEncargados(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.cargarSub = this.encargadoService
      .listar({
        filtro: this.filtroTexto(),
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'apellidos,asc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          // Filtrado estricto: no mostrar filas inactivas (estado = '0')
          const activos = page.content.filter((e) => e.estado !== '0');

          if (activos.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarEncargados();
            return;
          }

          this.encargados.set(activos);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorCarga.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No se pudo cargar la lista de encargados de áreas. Verifique la conexión con el servidor.',
          );
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarEncargados();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.paginaActual.set(0);
    this.cargarEncargados();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarEncargados();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarEncargados();
  }

  abrirNuevo(): void {
    this.encargadoSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(encargado: Encargado): void {
    this.encargadoSeleccionado.set(encargado);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.encargadoSeleccionado.set(null);
  }

  onGuardado(res: ApiResponse<Encargado>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Encargado guardado con éxito';
    this.notificationService.toast(mensaje);
    this.cargarEncargados();
  }

  async eliminar(encargado: Encargado): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const nombreCompleto =
      encargado.nombreCompleto?.trim() ||
      `${encargado.nombres} ${encargado.apellidos}`.trim();

    const resultado = await this.notificationService.confirm({
      title: '¿Eliminar encargado?',
      text: `¿Está seguro de eliminar a "${nombreCompleto}"? Esta acción dará de baja su registro como responsable firmante.`,
      icon: 'warning',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      cancelButtonClass:
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
    });

    if (resultado.isConfirmed && !this.destroyRef.destroyed) {
      this.procesandoFilaId.set(encargado.id);
      this.encargadoService
        .eliminar(encargado.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.procesandoFilaId.set(null)),
        )
        .subscribe({
          next: () => {
            // Remueve de inmediato la fila de la vista
            this.encargados.update((lista) => lista.filter((e) => e.id !== encargado.id));
            this.totalElementos.update((total) => Math.max(0, total - 1));
            this.notificationService.toast('Encargado eliminado con éxito');
            if (this.encargados().length === 0 && this.paginaActual() > 0) {
              this.paginaActual.update((p) => p - 1);
            }
            this.cargarEncargados();
          },
          error: () => {
            this.notificationService.error(
              'Error al eliminar',
              'No se pudo desactivar el encargado. Por favor, reintente.',
            );
          },
        });
    }
  }
}
