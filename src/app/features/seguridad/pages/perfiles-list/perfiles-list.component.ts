import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  LucideInbox,
  LucideLoader2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideToggleLeft,
  LucideToggleRight,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { PerfilFormModalComponent } from '../../components/perfil-form-modal/perfil-form-modal.component';
import { PerfilPermisosModalComponent } from '../../components/perfil-permisos-modal/perfil-permisos-modal.component';
import { Perfil, esPerfilAdminPrincipal } from '../../models';
import { ModuloService, PerfilService } from '../../services';

@Component({
  selector: 'app-perfiles-list',
  imports: [
    FormsModule,
    PerfilFormModalComponent,
    PerfilPermisosModalComponent,
    LucideSearch,
    LucidePlus,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideLoader2,
    LucideInbox,
    LucidePencil,
    LucideToggleRight,
    LucideToggleLeft,
  ],
  templateUrl: './perfiles-list.component.html',
})
export class PerfilesListComponent implements OnInit {
  private readonly perfilService = inject(PerfilService);
  private readonly moduloService = inject(ModuloService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly perfiles = signal<Perfil[]>([]);
  readonly totalModulosSistema = signal<number>(0);

  readonly cargando = signal<boolean>(false);
  readonly errorListado = signal<string | null>(null);
  readonly filtroTexto = signal<string>('');
  readonly estadoFiltro = signal<string>('1');
  readonly procesandoId = signal<number | null>(null);

  // Modal de permisos
  readonly perfilSeleccionado = signal<Perfil | null>(null);
  readonly modalPermisosVisible = signal<boolean>(false);

  // Modal de crear/editar perfil
  readonly perfilFormSeleccionado = signal<Perfil | null>(null);
  readonly modalFormVisible = signal<boolean>(false);

  readonly perfilesFiltrados = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const estado = this.estadoFiltro();
    let lista = this.perfiles();

    if (estado !== '') {
      const estadoNum = Number(estado);
      lista = lista.filter((p) => p.estado === estadoNum);
    }

    if (texto) {
      lista = lista.filter((p) => p.nombre.toLowerCase().includes(texto));
    }

    return lista;
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorListado.set(null);

    forkJoin({
      perfiles: this.perfilService.listar(),
      modulos: this.moduloService.listarActivos(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ perfiles, modulos }) => {
          this.perfiles.set(perfiles);
          this.totalModulosSistema.set(modulos.length);
        },
        error: () => {
          this.errorListado.set(
            'No se pudieron cargar los perfiles del sistema. Verifique la conexión.',
          );
        },
      });
  }

  esAdmin(perfil: Perfil | null): boolean {
    return esPerfilAdminPrincipal(perfil);
  }

  obtenerConteo(perfil: Perfil): number {
    return perfil.cantidadModulos ?? 0;
  }

  onCambioEstado(val: string): void {
    this.estadoFiltro.set(val);
  }

  onLimpiarFiltros(): void {
    this.filtroTexto.set('');
    this.estadoFiltro.set('1');
    this.cargarDatos();
  }

  abrirNuevoPerfil(): void {
    this.perfilFormSeleccionado.set(null);
    this.modalFormVisible.set(true);
  }

  abrirEditarPerfil(perfil: Perfil): void {
    this.perfilFormSeleccionado.set(perfil);
    this.modalFormVisible.set(true);
  }

  cerrarModalForm(): void {
    this.modalFormVisible.set(false);
    this.perfilFormSeleccionado.set(null);
  }

  onPerfilGuardado(): void {
    this.cerrarModalForm();
    this.cargarDatos();
  }

  abrirPermisos(perfil: Perfil): void {
    this.perfilSeleccionado.set(perfil);
    this.modalPermisosVisible.set(true);
  }

  cerrarModalPermisos(): void {
    this.modalPermisosVisible.set(false);
    this.perfilSeleccionado.set(null);
  }

  onPermisosGuardados(): void {
    this.cerrarModalPermisos();
    this.cargarDatos();
  }

  async toggleEstadoPerfil(p: Perfil): Promise<void> {
    if (this.esAdmin(p) || this.procesandoId() !== null) return;

    if (p.estado === 1) {
      const res = await this.notificationService.confirm({
        title: '¿Desactivar perfil?',
        text: `¿Está seguro de desactivar el perfil "${p.nombre}"?`,
        icon: 'warning',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-red text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      });

      if (res.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoId.set(p.id);
        this.perfilService
          .desactivar(p.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Perfil desactivado');
              this.cargarDatos();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo desactivar el perfil.');
              this.notificationService.error('Error al desactivar', msg);
            },
          });
      }
    } else {
      const res = await this.notificationService.confirm({
        title: '¿Activar perfil?',
        text: `¿Desea reactivar el perfil "${p.nombre}"?`,
        icon: 'question',
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar',
        confirmButtonClass:
          'bg-unsm-green text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 cursor-pointer',
      });

      if (res.isConfirmed && !this.destroyRef.destroyed) {
        this.procesandoId.set(p.id);
        this.perfilService
          .activar(p.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.procesandoId.set(null)),
          )
          .subscribe({
            next: () => {
              this.notificationService.toast('Perfil activado con éxito');
              this.cargarDatos();
            },
            error: (err: unknown) => {
              const msg = extraerMensajeError(err, 'No se pudo activar el perfil.');
              this.notificationService.error('Error al activar', msg);
            },
          });
      }
    }
  }
}
