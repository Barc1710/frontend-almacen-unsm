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
  LucideToggleLeft,
  LucideToggleRight,
  LucideTrash,
  LucideWarehouse,
} from '@lucide/angular';
import { firstValueFrom, finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { CustodiaFormModalComponent } from '../../components/custodia-form-modal/custodia-form-modal.component';
import { EncargadoAlmacen } from '../../models';
import { EncargadoAlmacenService } from '../../services';

@Component({
  selector: 'app-almacen-list',
  imports: [
    FormsModule,
    PaginationComponent,
    CustodiaFormModalComponent,
    LucideWarehouse,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash,
    LucideLoader2,
    LucideInbox,
    LucideCircleAlert,
    LucideToggleLeft,
    LucideToggleRight,
  ],
  templateUrl: './almacen-list.component.html',
})
export class AlmacenListComponent implements OnInit {
  private readonly encargadoAlmacenService = inject(EncargadoAlmacenService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly personalAlmacen = signal<EncargadoAlmacen[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorCarga = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');

  readonly personalSeleccionado = signal<EncargadoAlmacen | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly procesandoFilaId = signal<number | null>(null);
  readonly procesandoTitularId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarPersonal();
  }

  cargarPersonal(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.cargarSub = this.encargadoAlmacenService
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
          const activos = page.content.filter((p) => p.estado !== '0');

          if (activos.length === 0 && this.paginaActual() > 0 && page.totalElements > 0) {
            this.paginaActual.update((p) => p - 1);
            this.cargarPersonal();
            return;
          }

          this.personalAlmacen.set(activos);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorCarga.set(null);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No se pudo cargar la lista de personal de custodia. Verifique la conexión con el servidor.',
          );
          this.cargando.set(false);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarPersonal();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.paginaActual.set(0);
    this.cargarPersonal();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarPersonal();
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioPagina.set(nuevoTamanio);
    this.paginaActual.set(0);
    this.cargarPersonal();
  }

  abrirNuevo(): void {
    this.personalSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(persona: EncargadoAlmacen): void {
    this.personalSeleccionado.set(persona);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.personalSeleccionado.set(null);
  }

  onGuardado(res: ApiResponse<EncargadoAlmacen>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Personal de custodia guardado con éxito';
    this.notificationService.toast(mensaje);
    this.cargarPersonal();
  }

  /**
   * Alterna quién es el titular activo (es_titular = true/false).
   */
  async alternarTitular(persona: EncargadoAlmacen): Promise<void> {
    if (this.procesandoTitularId() !== null) return;

    const nuevoEstado = !persona.esTitular;
    this.procesandoTitularId.set(persona.id);

    try {
      if (nuevoEstado) {
        const titularPrevio = this.personalAlmacen().find(
          (p) => p.esTitular && p.id !== persona.id,
        );
        if (titularPrevio) {
          await firstValueFrom(
            this.encargadoAlmacenService.actualizar(titularPrevio.id, {
              nombres: titularPrevio.nombres,
              apellidos: titularPrevio.apellidos,
              dni: titularPrevio.dni,
              esTitular: false,
            }),
          );
        }
      }

      await firstValueFrom(
        this.encargadoAlmacenService.actualizar(persona.id, {
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          dni: persona.dni,
          esTitular: nuevoEstado,
        }),
      );

      const nombreDisplay = persona.nombreCompleto || `${persona.nombres} ${persona.apellidos}`.trim();
      const msg = nuevoEstado
        ? `"${nombreDisplay}" ha sido asignado como Titular de Turno.`
        : `Se ha retirado la titularidad de turno de "${nombreDisplay}".`;
      this.notificationService.toast(msg);

      this.cargarPersonal();
    } catch {
      this.notificationService.error(
        'Error de actualización',
        'No se pudo actualizar el estado de titularidad. Intente nuevamente.',
      );
    } finally {
      this.procesandoTitularId.set(null);
    }
  }

  async eliminar(persona: EncargadoAlmacen): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const nombreDisplay = persona.nombreCompleto || `${persona.nombres} ${persona.apellidos}`.trim();
    const resultado = await this.notificationService.confirm({
      title: '¿Eliminar personal de almacén?',
      text: `¿Está seguro de eliminar a "${nombreDisplay}"? Esta acción dará de baja su registro del sistema.`,
      icon: 'warning',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonClass:
        'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      cancelButtonClass:
        'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
    });

    if (resultado.isConfirmed && !this.destroyRef.destroyed) {
      this.procesandoFilaId.set(persona.id);
      this.encargadoAlmacenService
        .eliminar(persona.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.procesandoFilaId.set(null)),
        )
        .subscribe({
          next: () => {
            this.personalAlmacen.update((lista) => lista.filter((p) => p.id !== persona.id));
            this.totalElementos.update((total) => Math.max(0, total - 1));
            this.notificationService.toast('Personal de almacén eliminado con éxito');
            if (this.personalAlmacen().length === 0 && this.paginaActual() > 0) {
              this.paginaActual.update((p) => p - 1);
            }
            this.cargarPersonal();
          },
          error: () => {
            this.notificationService.error(
              'Error al eliminar',
              'No se pudo desactivar el personal de almacén. Por favor, reintente.',
            );
          },
        });
    }
  }
}
