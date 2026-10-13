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
import { ApiResponse } from '../../../../core/models';
import { extraerMensajeError } from '../../../../core/utils';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import {
  Perfil,
  Usuario,
  UsuarioCreateRequest,
  UsuarioUpdateRequest,
} from '../../models';
import { UsuarioService } from '../../services';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const clave = control.get('clave')?.value;
  const confirmar = control.get('confirmarClave')?.value;
  if (!clave && !confirmar) return null;
  return clave === confirmar ? null : { passwordMismatch: true };
}

function requiredTrimValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (typeof val !== 'string' || val.trim().length === 0) {
    return { required: true };
  }
  return null;
}

interface UsuarioFormControls {
  usuario: FormControl<string>;
  clave: FormControl<string>;
  confirmarClave: FormControl<string>;
  nombre: FormControl<string>;
  apellido: FormControl<string>;
  dni: FormControl<string>;
  correo: FormControl<string>;
  telefono: FormControl<string>;
  idPerfil: FormControl<number | null>;
}

@Component({
  selector: 'app-usuario-form-modal',
  imports: [
    ReactiveFormsModule,
    ModalDialogDirective,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
    LucideEye,
    LucideEyeOff,
  ],
  templateUrl: './usuario-form-modal.component.html',
})
export class UsuarioFormModalComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly usuario = input<Usuario | null>(null);
  readonly perfiles = input<Perfil[]>([]);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<Usuario>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly mostrarClave = signal<boolean>(false);
  readonly mostrarConfirmarClave = signal<boolean>(false);

  readonly isEdit = computed(() => !!this.usuario());

  readonly perfilesDisponibles = computed<Perfil[]>(() => {
    const lista = [...this.perfiles()];
    const u = this.usuario();
    if (u && u.idPerfil && !lista.some((p) => p.id === u.idPerfil)) {
      lista.unshift({
        id: u.idPerfil,
        nombre: u.nombrePerfil || 'Perfil asignado (inactivo)',
        estado: 0,
      });
    }
    return lista;
  });

  readonly form = new FormGroup<UsuarioFormControls>({
    usuario: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredTrimValidator,
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/),
      ],
    }),
    clave: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(100)],
    }),
    confirmarClave: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(100)],
    }),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimValidator, Validators.maxLength(100)],
    }),
    apellido: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimValidator, Validators.maxLength(100)],
    }),
    dni: new FormControl('', {
      nonNullable: true,
      validators: [
        (control) => {
          const val = (control.value || '').trim();
          if (!val) return null;
          return /^\d{8}$/.test(val) ? null : { invalidDni: true };
        },
      ],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(100)],
    }),
    telefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(20)],
    }),
    idPerfil: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const u = this.usuario();
        this.errorGeneral.set(null);
        this.guardando.set(false);
        this.mostrarClave.set(false);
        this.mostrarConfirmarClave.set(false);

        if (u) {
          // Modo Edición
          this.form.clearValidators();
          this.form.controls.clave.clearValidators();
          this.form.controls.clave.updateValueAndValidity();
          this.form.controls.confirmarClave.clearValidators();
          this.form.controls.confirmarClave.updateValueAndValidity();
          this.form.controls.usuario.disable();
          this.form.controls.idPerfil.enable();

          this.form.reset({
            usuario: u.usuario,
            clave: '',
            confirmarClave: '',
            nombre: u.nombre ?? '',
            apellido: u.apellido ?? '',
            dni: u.dni ?? '',
            correo: u.correo ?? '',
            telefono: u.telefono ?? '',
            idPerfil: u.idPerfil,
          });
        } else {
          // Modo Creación
          this.form.controls.usuario.enable();
          this.form.controls.idPerfil.enable();
          this.form.controls.clave.setValidators([
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(100),
          ]);
          this.form.controls.clave.updateValueAndValidity();
          this.form.controls.confirmarClave.setValidators([
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(100),
          ]);
          this.form.controls.confirmarClave.updateValueAndValidity();
          this.form.setValidators(passwordMatchValidator);

          this.form.reset({
            usuario: '',
            clave: '',
            confirmarClave: '',
            nombre: '',
            apellido: '',
            dni: '',
            correo: '',
            telefono: '',
            idPerfil: null,
          });
        }
      }
    });
  }

  isFieldInvalid(field: keyof UsuarioFormControls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  clavesNoCoinciden(): boolean {
    if (this.isEdit()) return false;
    const ctrl2 = this.form.controls.confirmarClave;
    return (ctrl2.dirty || ctrl2.touched) && this.form.hasError('passwordMismatch');
  }

  toggleMostrarClave(): void {
    this.mostrarClave.update((v) => !v);
  }

  toggleMostrarConfirmarClave(): void {
    this.mostrarConfirmarClave.update((v) => !v);
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeric = input.value.replace(/\D/g, '').slice(0, 8);
    this.form.controls.dni.setValue(numeric, { emitEvent: false });
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
    if (this.guardando()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    this.guardando.set(true);
    this.errorGeneral.set(null);

    if (this.isEdit()) {
      const actual = this.usuario();
      if (!actual) return;

      const payload: UsuarioUpdateRequest = {
        nombre: val.nombre.trim(),
        apellido: val.apellido.trim(),
        dni: val.dni.trim() || null,
        telefono: val.telefono.trim() || null,
        correo: val.correo.trim() || null,
        idPerfil: Number(val.idPerfil),
        estado: actual.estado,
      };

      this.usuarioService
        .actualizar(actual.id, payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.guardando.set(false)),
        )
        .subscribe({
          next: (res) => this.guardado.emit(res),
          error: (err: unknown) => this.procesarError(err),
        });
    } else {
      const payload: UsuarioCreateRequest = {
        usuario: val.usuario.trim(),
        clave: val.clave,
        nombre: val.nombre.trim(),
        apellido: val.apellido.trim(),
        dni: val.dni.trim() || null,
        telefono: val.telefono.trim() || null,
        correo: val.correo.trim() || null,
        idPerfil: Number(val.idPerfil),
      };

      this.usuarioService
        .crear(payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.guardando.set(false)),
        )
        .subscribe({
          next: (res) => this.guardado.emit(res),
          error: (err: unknown) => this.procesarError(err),
        });
    }
  }

  private procesarError(err: unknown): void {
    this.errorGeneral.set(extraerMensajeError(err, 'Ocurrió un error al procesar el usuario.'));
  }
}
