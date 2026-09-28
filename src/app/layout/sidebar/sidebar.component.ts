import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, linkedSignal } from '@angular/core';
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

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url),
    ),
    { initialValue: this.router.url },
  );

  readonly items = computed<SidebarItem[]>(() => {
    const rawModules = this.authService.modules();
    const sorted = [...rawModules].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const standardItems: SidebarItem[] = [];
    const seguridadSubmodules: SidebarItem[] = [];

    for (const mod of sorted) {
      const codigo = mod.codigo.trim().toUpperCase();
      const rawUrl = mod.url.trim();
      const url = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      const icono = getSidebarIcon(mod.icono || codigo);

      if (
        url.startsWith('/seguridad') ||
        codigo === 'USUARIOS' ||
        codigo === 'PERFILES' ||
        codigo === 'PERFIL' ||
        codigo === 'ROLES' ||
        codigo === 'PERMISOS'
      ) {
        seguridadSubmodules.push({
          id: mod.id,
          codigo,
          nombre: mod.nombre,
          url,
          icono,
          orden: mod.orden,
        });
        continue;
      }

      standardItems.push({
        id: mod.id,
        codigo,
        nombre: mod.nombre,
        url,
        icono,
        orden: mod.orden,
      });
    }

    if (seguridadSubmodules.length > 0) {
      standardItems.push({
        id: 'group-seguridad',
        codigo: 'SEGURIDAD',
        nombre: 'Seguridad',
        url: '/seguridad',
        icono: getSidebarIcon('SEGURIDAD'),
        orden: 9999,
        esGrupo: true,
        submodulos: seguridadSubmodules,
      });
    }

    return standardItems;
  });

  readonly isSeguridadActive = computed<boolean>(() => {
    const url = this.currentUrl();
    const items = this.items();
    const segGroup = items.find((i) => i.codigo === 'SEGURIDAD' && i.esGrupo);
    return (
      url.startsWith('/seguridad') ||
      (segGroup?.submodulos?.some((sub) => this.isSubActive(sub)) ?? false)
    );
  });

  readonly isSeguridadOpen = linkedSignal(() => this.isSeguridadActive());

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

  toggleSeguridad(): void {
    this.isSeguridadOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.layoutService.close();
  }
}
