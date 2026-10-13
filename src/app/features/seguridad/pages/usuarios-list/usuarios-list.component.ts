import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideInbox,
  LucideKeyRound,
  LucideLoader2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideToggleLeft,
  LucideToggleRight,
  LucideUsers,
} from '@lucide/angular';
import { finalize, Subscription } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { PaginationComponent } from '../../../../shared/components/pagination';
import { UsuarioFormModalComponent } from '../../components/usuario-form-modal/usuario-form-modal.component';
import { UsuarioResetClaveModalComponent } from '../../components/usuario-reset-clave-modal/usuario-reset-clave-modal.component';
import { Perfil, Usuario } from '../../models';
import { PerfilService, UsuarioService } from '../../services';

@Component({
  selector: 'app-usuarios-list',
  imports: [
    FormsModule,
    PaginationComponent,
    UsuarioFormModalComponent,
    UsuarioResetClaveModalComponent,
    LucideSearch,
    LucidePlus,
    LucideRefreshCw,
    LucidePencil,
    LucideKeyRound,
    LucideLoader2,
    LucideInbox,
    LucideUsers,
    LucideToggleRight,
    LucideToggleLeft,
  ],
  templateUrl: './usuarios-list.component.html',
})
export class UsuariosListComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly perfilService = inject(PerfilService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private cargarSub?: Subscription;

  // Estado reactivo de datos
  readonly usuarios = signal<Usuario[]>([]);
  readonly perfiles = signal<Perfil[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly errorListado = signal<string | null>(null);
  readonly procesandoFilaId = signal<number | null>(null);

  // Estado reactivo de filtros
  readonly filtroTexto = signal<string>('');
  readonly perfilFiltro = signal<number | null>(null);
  readonly estadoFiltro = signal<string>('1');

  // Estado reactivo de paginación
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(10);
  readonly totalElementos = signal<number>(0);
  readonly totalPaginas = signal<number>(0);

  // Modales
  readonly modalVisible = signal<boolean>(false);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);

  readonly modalResetClaveVisible = signal<boolean>(false);
  readonly usuarioResetClave = signal<Usuario | null>(null);

  ngOnInit(): void {
    this.cargarPerfiles();
    this.cargarUsuarios();
  }

  cargarPerfiles(): void {
    this.perfilService
      .listarActivos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => this.perfiles.set(lista),
        error: () => this.perfiles.set([]),
      });
  }

  cargarUsuarios(): void {
    this.cargarSub?.unsubscribe();
    this.cargando.set(true);
    this.errorListado.set(null);

    const perfilId = this.perfilFiltro();

    this.cargarSub = this.usuarioService
      .listar({
        filtro: this.filtroTexto() || undefined,
        idPerfil: perfilId && perfilId > 0 ? perfilId : undefined,
        estado: this.estadoFiltro() || undefined,
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        sort: 'nombre,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (page) => {
          this.usuarios.set(page.content);
          this.totalElementos.set(page.totalElements);
          this.totalPaginas.set(page.totalPages);
        },
        error: () => {
          this.errorListado.set('No se pudo conectar con el servidor para obtener los usuarios.');
        },
      });
  }

  onBuscar(): void {
    this.paginaActual.set(0);
    this.cargarUsuarios();
  }

  onCambioPerfil(val: number | null): void {
    this.perfilFiltro.set(val);
    this.paginaActual.set(0);
    this.cargarUsuarios();
  }

  onCambioEstado(val: string): void {
    this.estadoFiltro.set(val);
    this.paginaActual.set(0);
    this.cargarUsuarios();
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.perfilFiltro.set(null);
    this.estadoFiltro.set('1');
    this.paginaActual.set(0);
    this.cargarUsuarios();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarUsuarios();
  }

  cambiarTamanio(nuevoTamano: number): void {
    this.tamanioPagina.set(nuevoTamano);
    this.paginaActual.set(0);
    this.cargarUsuarios();
  }

  abrirNuevo(): void {
    this.usuarioSeleccionado.set(null);
    this.modalVisible.set(true);
  }

  abrirEditar(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.usuarioSeleccionado.set(null);
  }

  onGuardado(res?: ApiResponse<Usuario>): void {
    this.cerrarModal();
    if (res?.message) {
      this.notificationService.toast(res.message);
    }
    this.cargarUsuarios();
  }

  abrirResetClave(usuario: Usuario): void {
    this.usuarioResetClave.set(usuario);
    this.modalResetClaveVisible.set(true);
  }

  cerrarResetClave(): void {
    this.modalResetClaveVisible.set(false);
    this.usuarioResetClave.set(null);
  }

  onClaveReseteada(): void {
    this.cerrarResetClave();
    this.cargarUsuarios();
  }

  async toggleEstado(user: Usuario): Promise<void> {
    if (this.procesandoFilaId() !== null) return;

    if (user.estado === '1') {
      const resultado = await this.notificationService.confirm({
        title: '¿Desactivar usuario?',
        text: `¿Está seguro de suspender el acceso de "${user.nombreCompleto || user.usuario}"?`,
        icon: 'warning',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
      });

      if (resultado.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoFilaId.set(user.id);
        this.usuarioService
          .desactivar(user.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Usuario desactivado exitosamente');
              this.cargarUsuarios();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo desactivar el usuario.');
              this.notificationService.error('Error al desactivar', msg);
            },
          });
      }
    } else {
      const resultado = await this.notificationService.confirm({
        title: '¿Activar usuario?',
        text: `¿Desea restablecer el acceso al sistema para "${user.nombreCompleto || user.usuario}"?`,
        icon: 'question',
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-green text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
        cancelButtonClass:
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 cursor-pointer',
      });

      if (resultado.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoFilaId.set(user.id);
        this.usuarioService
          .activar(user.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoFilaId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Usuario activado exitosamente');
              this.cargarUsuarios();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo activar el usuario.');
              this.notificationService.error('Error al activar', msg);
            },
          });
      }
    }
  }
}
