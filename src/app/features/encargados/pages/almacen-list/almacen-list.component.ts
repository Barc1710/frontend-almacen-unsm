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
  LucideToggleLeft,
  LucideToggleRight,
  LucideUserCheck,
  LucideUserPlus,
  LucideWarehouse,
} from '@lucide/angular';
import { firstValueFrom, finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { CrearUsuarioModalComponent } from '../../components/crear-usuario-modal/crear-usuario-modal.component';
import { CustodiaFormModalComponent } from '../../components/custodia-form-modal/custodia-form-modal.component';
import { EncargadoAlmacen } from '../../models';
import { EncargadoAlmacenService } from '../../services';

@Component({
  selector: 'app-almacen-list',
  imports: [
    FormsModule,
    PaginationComponent,
    CustodiaFormModalComponent,
    CrearUsuarioModalComponent,
    LucideWarehouse,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideLoader2,
    LucideInbox,
    LucideToggleLeft,
    LucideToggleRight,
    LucideUserCheck,
    LucideUserPlus,
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
  readonly errorListado = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');
  readonly estadoFiltro = signal<string>('1');

  readonly personalSeleccionado = signal<EncargadoAlmacen | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly modalUsuarioVisible = signal<boolean>(false);
  readonly personaParaUsuario = signal<EncargadoAlmacen | null>(null);
  readonly procesandoFilaId = signal<number | null>(null);
  readonly procesandoTitularId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarPersonal();
  }

  cargarPersonal(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorListado.set(null);

    this.cargarSub = this.encargadoAlmacenService
      .listar({
        filtro: this.filtroTexto() || undefined,
        estado: this.estadoFiltro() || undefined,
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'apellidos,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (page) => {
          this.personalAlmacen.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorListado.set(null);
        },
        error: () => {
          this.errorListado.set(
            'No se pudieron cargar los encargados de almacén. Intente nuevamente.',
          );
          this.personalAlmacen.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarPersonal();
  }

  onCambioEstado(val: string): void {
    this.estadoFiltro.set(val);
    this.paginaActual.set(0);
    this.cargarPersonal();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.estadoFiltro.set('1');
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

  abrirCrearUsuario(persona: EncargadoAlmacen): void {
    this.personaParaUsuario.set(persona);
    this.modalUsuarioVisible.set(true);
  }

  cerrarModalUsuario(): void {
    this.modalUsuarioVisible.set(false);
    this.personaParaUsuario.set(null);
  }

  onUsuarioCreado(): void {
    this.cerrarModalUsuario();
    this.cargarPersonal();
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

    if (persona.estado !== '1') {
      this.notificationService.error(
        'Acción no permitida',
        'Un encargado inactivo no puede ser asignado como titular de turno.',
      );
      return;
    }

    this.procesandoTitularId.set(persona.id);

    try {
      const res = await firstValueFrom(this.encargadoAlmacenService.alternarTitular(persona.id));

      const titularActualizado = res.data?.esTitular ?? !persona.esTitular;
      const nombreDisplay =
        persona.nombreCompleto || `${persona.nombres} ${persona.apellidos}`.trim();
      const msg = titularActualizado
        ? `"${nombreDisplay}" ha sido asignado como Titular de Turno.`
        : `Se ha retirado la titularidad de turno de "${nombreDisplay}".`;
      this.notificationService.toast(msg);

      this.cargarPersonal();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string; mensaje?: string } };
      const mensajeError =
        apiErr?.error?.message ||
        apiErr?.error?.mensaje ||
        'No se pudo actualizar el estado de titularidad. Intente nuevamente.';
      this.notificationService.error('Error de actualización', mensajeError);
    } finally {
      this.procesandoTitularId.set(null);
    }
  }

  async toggleEstado(persona: EncargadoAlmacen): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const nombreCompleto =
      persona.nombreCompleto?.trim() || `${persona.nombres} ${persona.apellidos}`.trim();

    if (persona.estado === '1') {
      const resultado = await this.notificationService.confirm({
        title: '¿Desactivar encargado de almacén?',
        text: `¿Está seguro de suspender a "${nombreCompleto}"?`,
        icon: 'warning',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
      });

      if (resultado.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoFilaId.set(persona.id);
        this.encargadoAlmacenService
          .desactivar(persona.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Encargado de almacén desactivado exitosamente');
              this.cargarPersonal();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(
                err,
                'No se pudo desactivar el registro del encargado de almacén.',
              );
              this.notificationService.error('Error al desactivar', msg);
            },
          });
      }
    } else {
      const resultado = await this.notificationService.confirm({
        title: '¿Activar encargado de almacén?',
        text: `¿Desea restablecer a "${nombreCompleto}"?`,
        icon: 'question',
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-green text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
      });

      if (resultado.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoFilaId.set(persona.id);
        this.encargadoAlmacenService
          .activar(persona.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Encargado de almacén activado exitosamente');
              this.cargarPersonal();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(
                err,
                'No se pudo activar el registro del encargado de almacén.',
              );
              this.notificationService.error('Error al activar', msg);
            },
          });
      }
    }
  }
}
