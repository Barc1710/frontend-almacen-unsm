import { NgOptimizedImage } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { finalize, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequest } from '../../../core/models';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgOptimizedImage, LucideEye, LucideEyeOff],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly developmentLoginEnabled =
    !environment.production && environment.developmentLogin !== null;

  /**
   * Estado reactivo del componente
   */
  readonly isLoading = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitted = signal<boolean>(false);

  /**
   * Formulario reactivo tipado para credenciales
   */
  readonly loginForm = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    clave: ['', [Validators.required]],
  });

  constructor() {
    this.loginForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  /**
   * Verifica si un control de formulario es inválido únicamente tras haber intentado enviar el formulario
   */
  isFieldInvalid(fieldName: 'usuario' | 'clave'): boolean {
    const field = this.loginForm.get(fieldName);
    if (!this.isSubmitted() || !field) {
      return false;
    }
    const val = field.value;
    return field.invalid || (typeof val === 'string' && val.trim().length === 0);
  }

  /**
   * Envía las credenciales al servicio de autenticación
   */
  onSubmit(): void {
    this.isSubmitted.set(true);

    if (this.isLoading()) {
      return;
    }

    const rawCredentials = this.loginForm.getRawValue();
    const usuario = rawCredentials.usuario.trim();
    const clave = rawCredentials.clave;

    if (!usuario || !clave) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authenticate({ usuario, clave });
  }

  onDevelopmentLogin(): void {
    if (!this.developmentLoginEnabled || !environment.developmentLogin) return;
    this.authenticate(environment.developmentLogin);
  }

  private authenticate(credentials: LoginRequest): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.authService
      .login(credentials)
      .pipe(
        switchMap(() => this.authService.consultarMisModulos()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => this.finalizarNavegacion(),
        error: (error: unknown) => {
          this.authService.clearSession();
          this.procesarError(error);
        },
      });
  }

  private finalizarNavegacion(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    let destination = this.authService.landingUrl();
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('\\')) {
      if (this.authService.canAccessUrl(returnUrl)) {
        destination = returnUrl;
      }
    }
    void this.router.navigateByUrl(destination);
  }

  private procesarError(error: unknown): void {
    const err = error as {
      status?: number;
      error?: { mensaje?: string; message?: string };
      message?: string;
    };

    if (err?.status === 0) {
      this.errorMessage.set('No se pudo conectar con el servidor. Verifique su conexión.');
      return;
    }

    if (typeof err?.status === 'number' && err.status >= 500) {
      this.errorMessage.set('El servidor no está disponible. Inténtalo nuevamente.');
      return;
    }
    if (error instanceof Error && !('status' in error)) {
      this.errorMessage.set(error.message);
      return;
    }

    const backendMessage = err?.error?.mensaje || err?.error?.message;
    if (
      typeof backendMessage === 'string' &&
      backendMessage &&
      !/bad credentials|unauthorized/i.test(backendMessage)
    ) {
      this.errorMessage.set(backendMessage);
      return;
    }

    this.errorMessage.set('Usuario y/o contraseña incorrectos');
  }
}
