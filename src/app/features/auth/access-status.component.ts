import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-access-status',
  template: `
    <section
      class="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6"
      aria-labelledby="access-heading"
    >
      <h2 id="access-heading" class="text-xl font-semibold text-slate-900">Acceso no disponible</h2>
      <p class="mt-3 text-slate-700" role="status">
        {{ message() }}
      </p>
      <p class="mt-2 text-sm text-slate-600">
        Selecciona un módulo del menú o consulta con el administrador.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          (click)="retry()"
          [disabled]="loading()"
          class="rounded-lg bg-unsm-green-dark px-4 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unsm-green-dark disabled:opacity-60"
        >
          {{ loading() ? 'Consultando…' : 'Actualizar accesos' }}
        </button>
        <button
          type="button"
          (click)="auth.logout()"
          class="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unsm-green-dark"
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  `,
})
export class AccessStatusComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly message = signal('No tienes acceso a esta vista o no fue posible cargar tus permisos.');

  retry(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.auth
      .consultarMisModulos()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          if (this.auth.landingUrl() !== '/sin-acceso')
            void this.router.navigateByUrl(this.auth.landingUrl());
          else this.message.set('Tu cuenta no tiene módulos disponibles.');
        },
        error: () =>
          this.message.set('No se pudieron actualizar los accesos. Inténtalo nuevamente.'),
      });
  }
}
