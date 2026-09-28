import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, signal, Type } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  LucideBoxes,
  LucideBuilding2,
  LucideChevronDown,
  LucideClipboardList,
  LucideLayoutDashboard,
  LucidePackageCheck,
  LucideShieldCheck,
  LucideTruck,
  LucideUserCog,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { AuthService } from '../../core/services';
import { ModuloResponse } from '../../core/models';
import { LayoutService } from '../layout.service';
import { getSidebarIcon } from './sidebar-icons';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgOptimizedImage,
    LucideLayoutDashboard,
    LucideBoxes,
    LucideTruck,
    LucidePackageCheck,
    LucideClipboardList,
    LucideBuilding2,
    LucideUsers,
    LucideShieldCheck,
    LucideUserCog,
    LucideChevronDown,
    LucideX,
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);

  /**
   * Señal reactiva que monitorea la URL activa del enrutador
   */
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Determina de forma reactiva si la ruta activa corresponde al módulo o submódulos de seguridad
   */
  readonly isSeguridadActive = computed<boolean>(() =>
    this.currentUrl().includes('/seguridad'),
  );

  /**
   * Estado de apertura del submódulo desplegable Seguridad
   */
  readonly isSeguridadOpen = signal<boolean>(this.router.url.includes('/seguridad'));

  constructor() {
    // Si se navega a cualquier ruta de seguridad, expandir automáticamente el menú
    effect(() => {
      if (this.isSeguridadActive()) {
        this.isSeguridadOpen.set(true);
      }
    });
  }

  /**
   * Alterna la visibilidad del menú desplegable Seguridad
   */
  toggleSeguridad(): void {
    this.isSeguridadOpen.update((open) => !open);
  }

  /**
   * Ordena los módulos autorizados según el criterio de negocio: por orden ascendente.
   */
  sortedModules(): ModuloResponse[] {
    return [...this.authService.modules()].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  /**
   * Resuelve el icono correspondiente a un módulo a partir de su código.
   */
  getIcon(codigo: string | null | undefined): Type<unknown> {
    return getSidebarIcon(codigo);
  }

  /**
   * Cierra el menú lateral en modo móvil al interactuar o navegar.
   */
  closeMobileMenu(): void {
    this.layoutService.close();
  }
}
