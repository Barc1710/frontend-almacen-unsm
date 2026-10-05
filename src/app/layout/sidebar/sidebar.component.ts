import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  type LucideIcon,
  LucideX,
} from '@lucide/angular';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';
import { getSidebarIcon } from './sidebar-icons';

export interface SidebarItem {
  readonly id: number | string;
  readonly codigo: string;
  readonly nombre: string;
  readonly url: string;
  readonly icono: LucideIcon;
  readonly orden: number;
  readonly esGrupo?: boolean;
  readonly submodulos?: SidebarItem[];
}

interface GroupConfig {
  readonly codigo: string;
  readonly nombre: string;
  readonly url: string;
  readonly defaultIcon: string;
  readonly matches: (codigo: string, url: string) => boolean;
}

const SIDEBAR_GROUPS: readonly GroupConfig[] = [
  {
    codigo: 'INVENTARIO',
    nombre: 'Inventario',
    url: '/inventario',
    defaultIcon: 'INVENTARIO',
    matches: (codigo, url) => {
      if (url === '/inventario' && codigo === 'INVENTARIO') return false;
      return (
        url.startsWith('/inventario/') ||
        codigo.startsWith('INVENTARIO_') ||
        codigo === 'ARTICULOS' ||
        codigo === 'FAMILIAS' ||
        codigo === 'MARCAS'
      );
    },
  },
  {
    codigo: 'SEGURIDAD',
    nombre: 'Seguridad',
    url: '/seguridad',
    defaultIcon: 'SEGURIDAD',
    matches: (codigo, url) => {
      if (url === '/seguridad' && codigo === 'SEGURIDAD') return false;
      return (
        url.startsWith('/seguridad/') ||
        codigo.startsWith('SEGURIDAD_') ||
        ['USUARIOS', 'PERFILES', 'PERFIL', 'ROLES', 'PERMISOS'].includes(codigo)
      );
    },
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgOptimizedImage,
    LucideChevronDown,
    LucideX,
    LucideDynamicIcon,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);
  private readonly router = inject(Router);

  private readonly manualOpenState = signal<Record<string, boolean>>({});

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // Al cambiar de ruta, reiniciamos sobrescrituras manuales para que el grupo activo se despliegue naturalmente
        this.manualOpenState.set({});
      });
  }

  readonly items = computed<SidebarItem[]>(() => {
    const rawModules = this.authService.modules();
    const sorted = [...rawModules].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const topLevelItems: SidebarItem[] = [];
    const groupSubmodulesMap = new Map<string, SidebarItem[]>();

    for (const group of SIDEBAR_GROUPS) {
      groupSubmodulesMap.set(group.codigo, []);
    }

    for (const mod of sorted) {
      const codigo = mod.codigo.trim().toUpperCase();
      const rawUrl = mod.url.trim();
      const url = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      const icono = getSidebarIcon(mod.icono || codigo);

      const item: SidebarItem = {
        id: mod.id,
        codigo,
        nombre: mod.nombre,
        url,
        icono,
        orden: mod.orden ?? 0,
      };

      let assignedToGroup = false;
      for (const group of SIDEBAR_GROUPS) {
        if (group.matches(codigo, url)) {
          groupSubmodulesMap.get(group.codigo)?.push(item);
          assignedToGroup = true;
          break;
        }
      }

      if (!assignedToGroup) {
        topLevelItems.push(item);
      }
    }

    // Agregar grupos construidos si tienen submódulos autorizados
    for (const group of SIDEBAR_GROUPS) {
      const submodulos = groupSubmodulesMap.get(group.codigo) ?? [];
      if (submodulos.length > 0) {
        // Ordenar submódulos por su orden asignado
        submodulos.sort((a, b) => a.orden - b.orden);

        // Si existía un contenedor padre redundante en topLevel, removerlo
        const filteredTop = topLevelItems.filter((i) => i.codigo !== group.codigo);
        topLevelItems.length = 0;
        topLevelItems.push(...filteredTop);

        topLevelItems.push({
          id: `group-${group.codigo.toLowerCase()}`,
          codigo: group.codigo,
          nombre: group.nombre,
          url: group.url,
          icono: getSidebarIcon(group.defaultIcon),
          orden: submodulos[0].orden,
          esGrupo: true,
          submodulos,
        });
      }
    }

    // Ordenar todos los elementos de primer nivel por orden ascendente
    topLevelItems.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    return topLevelItems;
  });

  isGroupActive(group: SidebarItem): boolean {
    const current = this.currentUrl();
    if (current === group.url || current.startsWith(group.url + '/')) {
      return true;
    }
    return group.submodulos?.some((sub) => this.isSubActive(sub)) ?? false;
  }

  isGroupOpen(group: SidebarItem): boolean {
    const manual = this.manualOpenState()[group.codigo];
    if (manual !== undefined) {
      return manual;
    }
    return this.isGroupActive(group);
  }

  toggleGroup(group: SidebarItem): void {
    const current = this.isGroupOpen(group);
    this.manualOpenState.update((state) => ({
      ...state,
      [group.codigo]: !current,
    }));
  }

  isItemActive(item: SidebarItem, rlaActive?: boolean): boolean {
    if (rlaActive) return true;
    const current = this.currentUrl();
    if (item.url === '/dashboard') {
      return current === '/dashboard' || current === '' || current === '/';
    }
    return current === item.url || current.startsWith(item.url + '/');
  }

  isSubActive(sub: SidebarItem, rlaActive?: boolean): boolean {
    if (rlaActive) return true;
    const current = this.currentUrl();
    return current === sub.url || current.startsWith(sub.url + '/');
  }

  // Compatibilidad hacia atrás
  readonly isSeguridadActive = computed<boolean>(() => {
    const seg = this.items().find((i) => i.codigo === 'SEGURIDAD' && i.esGrupo);
    return seg ? this.isGroupActive(seg) : false;
  });

  isSeguridadOpen(): boolean {
    const seg = this.items().find((i) => i.codigo === 'SEGURIDAD' && i.esGrupo);
    return seg ? this.isGroupOpen(seg) : false;
  }

  toggleSeguridad(): void {
    const seg = this.items().find((i) => i.codigo === 'SEGURIDAD' && i.esGrupo);
    if (seg) this.toggleGroup(seg);
  }

  closeMobileMenu(): void {
    this.layoutService.close();
  }
}
