import { computed, Component, inject, signal } from '@angular/core';
import { LucideChevronDown, LucideLogOut, LucideMenu, LucideUser } from '@lucide/angular';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-topbar',
  imports: [LucideMenu, LucideLogOut, LucideUser, LucideChevronDown],
  templateUrl: './topbar.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeProfileMenu()',
  },
})
export class TopbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly layoutService = inject(LayoutService);

  /**
   * Estado de visibilidad del menú emergente de perfil de usuario.
   */
  readonly isProfileMenuOpen = signal<boolean>(false);

  /**
   * Iniciales del usuario para el avatar del perfil.
   */
  readonly userInitials = computed<string>(() => {
    const initials = this.authService.userFullName().trim().slice(0, 2).toUpperCase();
    return initials || 'U';
  });

  /**
   * Alterna la visibilidad del menú de perfil.
   */
  toggleProfileMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen.update((open) => !open);
  }

  /**
   * Cierra el menú desplegable de perfil.
   */
  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  /**
   * Alterna la visibilidad del drawer lateral en dispositivos móviles.
   */
  toggleMobileSidebar(): void {
    this.layoutService.toggle();
  }

  /**
   * Cierra la sesión activa del usuario y redirige al login.
   */
  logout(): void {
    this.closeProfileMenu();
    this.authService.logout();
  }

  /**
   * Cierra el menú de perfil si se hace clic fuera del contenedor.
   */
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('#profile-menu-container')) {
      this.closeProfileMenu();
    }
  }
}
