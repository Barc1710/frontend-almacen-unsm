import { DestroyRef, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Servicio reactivo para la gestión del estado global de la disposición (layout),
 * en particular el control de apertura y cierre del menú lateral en dispositivos móviles.
 */
@Service()
export class LayoutService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _isMobileSidebarOpen = signal<boolean>(false);

  /**
   * Señal de solo lectura que indica si el drawer lateral móvil está abierto.
   */
  readonly isMobileSidebarOpen = this._isMobileSidebarOpen.asReadonly();

  constructor() {
    // Cerrar automáticamente el menú móvil al completarse cualquier navegación de ruta
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.close();
      });
  }

  /**
   * Alterna el estado de apertura del menú lateral en móvil.
   */
  toggle(): void {
    this._isMobileSidebarOpen.update((open) => !open);
  }

  /**
   * Abre explícitamente el menú lateral en móvil.
   */
  open(): void {
    this._isMobileSidebarOpen.set(true);
  }

  /**
   * Cierra explícitamente el menú lateral en móvil.
   */
  close(): void {
    this._isMobileSidebarOpen.set(false);
  }
}
