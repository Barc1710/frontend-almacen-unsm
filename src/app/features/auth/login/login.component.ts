import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    NgOptimizedImage,
    LucideEye,
    LucideEyeOff,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
    this.loginForm.valueChanges.subscribe(() => {
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

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials = { usuario, clave };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.authService.consultarMisModulos().subscribe({
          next: () => this.finalizarNavegacion(),
          error: () => this.finalizarNavegacion(),
        });
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.procesarError(error);
      },
    });
  }

  /**
   * Inicia sesión simulada con perfil Administrador para pruebas sin API
   */
  onAccesoDemo(): void {
    this.errorMessage.set(null);
    this.authService.iniciarSesionDemo();
  }

  private finalizarNavegacion(): void {
    this.isLoading.set(false);
    if (this.authService.debeCambiarClave()) {
      void this.router.navigate(['/cambiar-clave']);
      return;
    }
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    const destination = returnUrl && !returnUrl.includes('/login') ? returnUrl : '/';
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

    const backendMessage = err?.error?.mensaje || err?.error?.message;
    if (backendMessage && !/bad credentials|unauthorized/i.test(backendMessage)) {
      this.errorMessage.set(backendMessage);
      return;
    }

    this.errorMessage.set('Usuario y/o contraseña incorrectos');
  }
}
