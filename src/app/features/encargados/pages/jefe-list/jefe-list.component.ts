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
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { CrearUsuarioModalComponent } from '../../components/crear-usuario-modal/crear-usuario-modal.component';
import { EncargadoFormModalComponent } from '../../components/encargado-form-modal/encargado-form-modal.component';
import { Encargado } from '../../models';
import { EncargadoService } from '../../services';

@Component({
  selector: 'app-jefe-list',
  imports: [
    FormsModule,
    PaginationComponent,
    EncargadoFormModalComponent,
    CrearUsuarioModalComponent,
    LucideUserCheck,
    LucideUserPlus,
    LucidePlus,
    LucideSearch,
    LucideRefreshCw,
    LucidePencil,
    LucideToggleRight,
    LucideToggleLeft,
    LucideLoader2,
    LucideInbox,
  ],
  templateUrl: './jefe-list.component.html',
})
export class JefeListComponent implements OnInit {
  private readonly encargadoService = inject(EncargadoService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  readonly encargados = signal<Encargado[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorListado = signal<string | null>(null);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly filtroTexto = signal<string>('');
  readonly estadoFiltro = signal<string>('1');

  readonly encargadoSeleccionado = signal<Encargado | null>(null);
  readonly modalVisible = signal<boolean>(false);
  readonly modalUsuarioVisible = signal<boolean>(false);
  readonly personaParaUsuario = signal<Encargado | null>(null);
  readonly procesandoFilaId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarEncargados();
  }

  cargarEncargados(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorListado.set(null);

    this.cargarSub = this.encargadoService
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
          this.encargados.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
          this.errorListado.set(null);
        },
        error: () => {
          this.errorListado.set('No se pudieron cargar los jefes de almacén. Intente nuevamente.');
          this.encargados.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
        },
      });
  }

  onBuscarTexto(): void {
    this.paginaActual.set(0);
    this.cargarEncargados();
  }

  onCambioEstado(val: string): void {
    this.estadoFiltro.set(val);
    this.paginaActual.set(0);
    this.cargarEncargados();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.estadoFiltro.set('1');
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

  abrirCrearUsuario(encargado: Encargado): void {
    this.personaParaUsuario.set(encargado);
    this.modalUsuarioVisible.set(true);
  }

  cerrarModalUsuario(): void {
    this.modalUsuarioVisible.set(false);
    this.personaParaUsuario.set(null);
  }

  onUsuarioCreado(): void {
    this.cerrarModalUsuario();
    this.cargarEncargados();
  }

  onGuardado(res: ApiResponse<Encargado>): void {
    this.cerrarModal();
    const mensaje = res.mensaje || res.message || 'Jefe guardado con éxito';
    this.notificationService.toast(mensaje);
    this.cargarEncargados();
  }

  async toggleEstado(encargado: Encargado): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    const nombreCompleto =
      encargado.nombreCompleto?.trim() ||
      `${encargado.nombres} ${encargado.apellidos}`.trim();

    if (encargado.estado === '1') {
      const resultado = await this.notificationService.confirm({
        title: '¿Desactivar jefe?',
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
        this.procesandoFilaId.set(encargado.id);
        this.encargadoService
          .desactivar(encargado.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Jefe desactivado exitosamente');
              this.cargarEncargados();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo desactivar el registro del jefe.');
              this.notificationService.error('Error al desactivar', msg);
            },
          });
      }
    } else {
      const resultado = await this.notificationService.confirm({
        title: '¿Activar jefe?',
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
        this.procesandoFilaId.set(encargado.id);
        this.encargadoService
          .activar(encargado.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Jefe activado exitosamente');
              this.cargarEncargados();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo activar el registro del jefe.');
              this.notificationService.error('Error al activar', msg);
            },
          });
      }
    }
  }
}
