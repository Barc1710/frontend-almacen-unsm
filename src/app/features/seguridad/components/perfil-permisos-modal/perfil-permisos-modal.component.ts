import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideCircleAlert,
  LucideLoader2,
  LucideSave,
  LucideX,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { ModuloResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Perfil } from '../../models';
import { ModuloService, PerfilService } from '../../services';

export interface PermisoIndividual {
  readonly tipo: 'individual';
  readonly id: number;
  readonly nombre: string;
  readonly orden: number;
}

export interface PermisoGrupo {
  readonly tipo: 'grupo';
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
  readonly hijos: ModuloResponse[];
}

const SIDEBAR_GROUP_DEFS: readonly {
  readonly id: string;
  readonly nombre: string;
  readonly matches: (codigo: string, url: string) => boolean;
}[] = [
  {
    id: 'INVENTARIO',
    nombre: 'Inventario',
    matches: (c, u) =>
      u.startsWith('/inventario/') ||
      c.startsWith('INVENTARIO_') ||
      ['ARTICULOS', 'FAMILIAS', 'MARCAS', 'UBICACIONES'].includes(c),
  },
  {
    id: 'ENCARGADOS',
    nombre: 'Encargados',
    matches: (c, u) =>
      u.startsWith('/encargados/') ||
      c.startsWith('ENCARGADOS_') ||
      ['ENCARGADOS_JEFE', 'ENCARGADOS_ALMACEN', 'JEFE'].includes(c),
  },
  {
    id: 'SEGURIDAD',
    nombre: 'Seguridad',
    matches: (c, u) =>
      u.startsWith('/seguridad/') ||
      c.startsWith('SEGURIDAD_') ||
      ['USUARIOS', 'PERFILES', 'PERMISOS'].includes(c),
  },
];

@Component({
  selector: 'app-perfil-permisos-modal',
  imports: [
    ModalDialogDirective,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './perfil-permisos-modal.component.html',
})
export class PerfilPermisosModalComponent {
  private readonly perfilService = inject(PerfilService);
  private readonly moduloService = inject(ModuloService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly perfil = input<Perfil | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  readonly modulos = signal<ModuloResponse[]>([]);
  readonly idsSeleccionados = signal<Set<number>>(new Set());
  readonly idsOriginales = signal<Set<number>>(new Set());

  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly errorCarga = signal<string | null>(null);

  /** Módulos independientes que no tienen submódulos (Dashboard, Ingresos, Egresos, Kardex, Proveedores, Clientes) */
  readonly modulosGenerales = computed<PermisoIndividual[]>(() => {
    const todos = this.modulos();
    if (todos.length === 0) return [];

    const individuales: PermisoIndividual[] = [];
    for (const mod of todos) {
      const c = mod.codigo?.trim().toUpperCase() ?? '';
      const u = mod.url?.trim().toLowerCase() ?? '';

      if (
        (c === 'INVENTARIO' && u === '/inventario') ||
        (c === 'ENCARGADOS' && u === '/encargados') ||
        (c === 'SEGURIDAD' && u === '/seguridad')
      ) {
        continue;
      }

      const isGrouped = SIDEBAR_GROUP_DEFS.some((g) => g.matches(c, u));
      if (!isGrouped) {
        individuales.push({
          tipo: 'individual',
          id: mod.id,
          nombre: mod.nombre,
          orden: mod.orden ?? 999,
        });
      }
    }

    return individuales.sort((a, b) => a.orden - b.orden);
  });

  /** Grupos estructurados con sus submódulos correspondientes (Inventario, Encargados, Seguridad) */
  readonly gruposConSubmodulos = computed<PermisoGrupo[]>(() => {
    const todos = this.modulos();
    if (todos.length === 0) return [];

    const groupMap = new Map<string, ModuloResponse[]>();
    for (const g of SIDEBAR_GROUP_DEFS) {
      groupMap.set(g.id, []);
    }

    for (const mod of todos) {
      const c = mod.codigo?.trim().toUpperCase() ?? '';
      const u = mod.url?.trim().toLowerCase() ?? '';

      if (
        (c === 'INVENTARIO' && u === '/inventario') ||
        (c === 'ENCARGADOS' && u === '/encargados') ||
        (c === 'SEGURIDAD' && u === '/seguridad')
      ) {
        continue;
      }

      for (const g of SIDEBAR_GROUP_DEFS) {
        if (g.matches(c, u)) {
          groupMap.get(g.id)!.push(mod);
          break;
        }
      }
    }

    const resultado: PermisoGrupo[] = [];
    for (const g of SIDEBAR_GROUP_DEFS) {
      const hijos = groupMap.get(g.id) ?? [];
      if (hijos.length > 0) {
        const sortedHijos = [...hijos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        const minOrden = sortedHijos[0]?.orden ?? 999;
        resultado.push({
          tipo: 'grupo',
          id: g.id,
          nombre: g.nombre,
          orden: minOrden,
          hijos: sortedHijos,
        });
      }
    }

    return resultado.sort((a, b) => a.orden - b.orden);
  });

  readonly todosSeleccionados = computed(() => {
    const total = this.modulos().length;
    if (total === 0) return false;
    return this.idsSeleccionados().size >= total;
  });

  readonly tieneCambios = computed(() => {
    const actual = this.idsSeleccionados();
    const orig = this.idsOriginales();
    if (actual.size !== orig.size) return true;
    for (const id of actual) {
      if (!orig.has(id)) return true;
    }
    return false;
  });

  constructor() {
    effect(() => {
      if (this.visible() && this.perfil()) {
        this.cargarDatos(this.perfil()!);
      }
    });
  }

  cargarDatos(perfil: Perfil): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    forkJoin({
      todosModulos: this.moduloService.listarActivos(),
      permisosPerfil: this.perfilService.obtenerModulosPorPerfil(perfil.id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ todosModulos, permisosPerfil }) => {
          this.modulos.set(todosModulos);
          const activos = new Set<number>(
            (permisosPerfil.modulosAutorizados ?? []).map((m) => m.id),
          );
          this.idsSeleccionados.set(new Set(activos));
          this.idsOriginales.set(new Set(activos));
        },
        error: () => {
          this.errorCarga.set(
            'No se pudieron cargar los módulos y permisos del perfil. Verifique su conexión.',
          );
        },
      });
  }

  estaSeleccionado(moduloId: number): boolean {
    return this.idsSeleccionados().has(moduloId);
  }

  isGrupoCompleto(grupo: PermisoGrupo): boolean {
    const sel = this.idsSeleccionados();
    return grupo.hijos.length > 0 && grupo.hijos.every((h) => sel.has(h.id));
  }

  contarSeleccionadosEnGrupo(grupo: PermisoGrupo): number {
    const sel = this.idsSeleccionados();
    return grupo.hijos.filter((h) => sel.has(h.id)).length;
  }

  toggleModulo(moduloId: number): void {
    if (this.guardando()) return;

    this.idsSeleccionados.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(moduloId)) {
        nuevo.delete(moduloId);
      } else {
        nuevo.add(moduloId);
      }
      return nuevo;
    });
  }

  toggleGrupo(grupo: PermisoGrupo): void {
    if (this.guardando()) return;

    const completo = this.isGrupoCompleto(grupo);
    this.idsSeleccionados.update((set) => {
      const nuevo = new Set(set);
      for (const m of grupo.hijos) {
        if (completo) {
          nuevo.delete(m.id);
        } else {
          nuevo.add(m.id);
        }
      }
      return nuevo;
    });
  }

  toggleHijoEnGrupo(_grupo: PermisoGrupo, hijoId: number): void {
    this.toggleModulo(hijoId);
  }

  toggleTodos(): void {
    if (this.guardando()) return;

    if (this.todosSeleccionados()) {
      this.idsSeleccionados.set(new Set<number>());
    } else {
      const todos = this.modulos().map((m) => m.id);
      this.idsSeleccionados.set(new Set(todos));
    }
  }

  onCerrar(): void {
    if (this.guardando()) return;
    this.cerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.guardando()) {
      this.onCerrar();
    }
  }

  onGuardar(): void {
    const p = this.perfil();
    if (!p || this.guardando()) return;

    const idsModulos = Array.from(this.idsSeleccionados());
    this.guardando.set(true);

    this.perfilService
      .actualizarPermisos(p.id, { idsModulos })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.notificationService.toast('Permisos actualizados con éxito');
          this.guardado.emit();
        },
        error: (err: unknown) => {
          const mensaje = extraerMensajeError(err, 'Error al actualizar permisos.');
          this.notificationService.error('Error al guardar', mensaje);
        },
      });
  }
}
