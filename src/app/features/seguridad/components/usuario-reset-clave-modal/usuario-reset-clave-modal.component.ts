import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  LucideCircleAlert,
  LucideEye,
  LucideEyeOff,
  LucideLoader2,
  LucideSave,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Usuario } from '../../models';
import { UsuarioService } from '../../services';

interface ResetClaveControls {
  nuevaClave: FormControl<string>;
  confirmarClave: FormControl<string>;
}

function resetClaveMatchValidator(control: AbstractControl): ValidationErrors | null {
  const c1 = control.get('nuevaClave')?.value;
  const c2 = control.get('confirmarClave')?.value;
  if (!c2) return null;
  return c1 === c2 ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-usuario-reset-clave-modal',
  imports: [
    ReactiveFormsModule,
    ModalDialogDirective,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideEye,
    LucideEyeOff,
    LucideCircleAlert,
  ],
  templateUrl: './usuario-reset-clave-modal.component.html',
})
export class UsuarioResetClaveModalComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly usuario = input<Usuario | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  readonly guardando = signal<boolean>(false);
  readonly mostrarNuevaClave = signal<boolean>(false);
  readonly mostrarConfirmarClave = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly form = new FormGroup<ResetClaveControls>(
    {
      nuevaClave: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6), Validators.maxLength(100)],
      }),
      confirmarClave: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6), Validators.maxLength(100)],
      }),
    },
    { validators: [resetClaveMatchValidator] },
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.form.reset({ nuevaClave: '', confirmarClave: '' });
        this.errorGeneral.set(null);
        this.guardando.set(false);
        this.mostrarNuevaClave.set(false);
        this.mostrarConfirmarClave.set(false);
      }
    });
  }

  isFieldInvalid(field: keyof ResetClaveControls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  clavesNoCoinciden(): boolean {
    const ctrl2 = this.form.controls.confirmarClave;
    return (ctrl2.dirty || ctrl2.touched) && this.form.hasError('passwordMismatch');
  }

  toggleMostrarNuevaClave(): void {
    this.mostrarNuevaClave.update((v) => !v);
  }

  toggleMostrarConfirmarClave(): void {
    this.mostrarConfirmarClave.update((v) => !v);
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

  onSubmit(): void {
    const user = this.usuario();
    if (!user || this.guardando()) return;

    if (this.form.invalid || this.clavesNoCoinciden()) {
      this.form.markAllAsTouched();
      return;
    }

    const nuevaClave = this.form.controls.nuevaClave.value;
    this.guardando.set(true);
    this.errorGeneral.set(null);

    this.usuarioService
      .resetearClave(user.id, { nuevaClave })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.notificationService.toast('Contraseña actualizada con éxito');
          this.guardado.emit();
        },
        error: (err: unknown) => {
          this.errorGeneral.set(
            extraerMensajeError(err, 'Error al cambiar la contraseña. Intente nuevamente.'),
          );
        },
      });
  }
}
