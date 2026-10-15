import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideInbox,
  LucideLoader2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash,
  LucideTruck,
  LucideUser,
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { ProveedorFormModalComponent } from '../../components/proveedor-form-modal/proveedor-form-modal.component';
import { Proveedor } from '../../models';
import { ProveedorService } from '../../services';

@Component({
  selector: 'app-proveedores-list',
  imports: [
    FormsModule,
    PaginationComponent,
    ProveedorFormModalComponent,
    LucideSearch,
    LucidePlus,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideLoader2,
    LucideInbox,
    LucideTruck,
    LucideUser,
  ],
  templateUrl: './proveedores-list.component.html',
})
export class ProveedoresListComponent implements OnInit {
  private readonly proveedorService = inject(ProveedorService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorListado = signal<string | null>(null);

  // Paginación
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);

  // Filtros
  readonly filtroTexto = signal<string>('');

  // Modales
  readonly proveedorSeleccionado = signal<Proveedor | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorListado.set(null);

    this.cargarSub = this.proveedorService
      .listar({
        filtro: this.filtroTexto(),
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'razonSocial,asc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.content.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarProveedores();
            return;
          }

          this.proveedores.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorListado.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.errorListado.set(
            'No se pudieron cargar los proveedores. Verifique la conexión con el servidor.',
          );
          this.proveedores.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
        },
      });
  }

  onBuscar(): void {
    this.paginaActual.set(0);
    this.cargarProveedores();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.paginaActual.set(0);
    this.cargarProveedores();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarProveedores();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarProveedores();
  }

  abrirNuevo(): void {
    this.proveedorSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(proveedor: Proveedor): void {
    this.proveedorSeleccionado.set(proveedor);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.proveedorSeleccionado.set(null);
  }

  onGuardado(res: ApiResponse<Proveedor>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Proveedor guardado exitosamente';
    this.notificationService.toast(mensaje);
    this.cargarProveedores();
  }

  async eliminarProveedor(p: Proveedor): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const resultado = await this.notificationService.confirm({
      title: '¿Eliminar proveedor?',
      text: `¿Está seguro de eliminar al proveedor "${p.razonSocial}"?`,
      icon: 'warning',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      cancelButtonClass:
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
    });

    if (resultado.isConfirmed && !this.destroyRef.destroyed) {
      this.procesandoFilaId.set(p.id);
      this.proveedorService
        .eliminar(p.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.procesandoFilaId.set(null)),
        )
        .subscribe({
          next: () => {
            this.notificationService.toast('Proveedor eliminado exitosamente');
            this.cargarProveedores();
          },
          error: (err: unknown) => {
            const msg = this.extraerError(err, 'No se pudo eliminar el proveedor.');
            this.notificationService.error('Error al eliminar', msg);
          },
        });
    }
  }

  private extraerError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
      const e = err as { error?: { message?: string; mensaje?: string } };
      if (e.error?.message) return e.error.message;
      if (e.error?.mensaje) return e.error.mensaje;
    }
    return fallback;
  }
}
