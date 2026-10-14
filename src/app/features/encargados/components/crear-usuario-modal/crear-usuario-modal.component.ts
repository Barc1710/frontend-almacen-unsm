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
import { Observable, finalize } from 'rxjs';
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Perfil } from '../../../seguridad/models';
import { PerfilService } from '../../../seguridad/services';
import {
  CrearUsuarioEncargadoRequest,
  Encargado,
  EncargadoAlmacen,
} from '../../models';
import { EncargadoAlmacenService, EncargadoService } from '../../services';

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

interface CrearUsuarioFormControls {
  usuario: FormControl<string>;
  clave: FormControl<string>;
  confirmarClave: FormControl<string>;
  correo: FormControl<string>;
  telefono: FormControl<string>;
  idPerfil: FormControl<number | null>;
}

@Component({
  selector: 'app-crear-usuario-modal',
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
  templateUrl: './crear-usuario-modal.component.html',
})
export class CrearUsuarioModalComponent {
  private readonly encargadoService = inject(EncargadoService);
  private readonly encargadoAlmacenService = inject(EncargadoAlmacenService);
  private readonly perfilService = inject(PerfilService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly persona = input<Encargado | EncargadoAlmacen | null>(null);
  readonly tipo = input<'JEFE' | 'ALMACEN'>('JEFE');

  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly perfiles = signal<Perfil[]>([]);
  readonly cargandoPerfiles = signal<boolean>(false);

  readonly mostrarClave = signal<boolean>(false);
  readonly mostrarConfirmarClave = signal<boolean>(false);

  readonly form = new FormGroup<CrearUsuarioFormControls>(
    {
      usuario: new FormControl('', {
        nonNullable: true,
        validators: [
          requiredTrimValidator,
          Validators.minLength(3),
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
    },
    { validators: passwordMatchValidator },
  );

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const p = this.persona();

      if (isVisible && p) {
        this.resetFormulario(p);
        this.cargarPerfiles();
      }
    });
  }

  private resetFormulario(_p: Encargado | EncargadoAlmacen): void {
    this.form.reset();
    this.errorGeneral.set(null);
    this.mostrarClave.set(false);
    this.mostrarConfirmarClave.set(false);

    this.form.patchValue({
      usuario: '',
      clave: '',
      confirmarClave: '',
      correo: '',
      telefono: '',
      idPerfil: null,
    });
  }

  private cargarPerfiles(): void {
    if (this.perfiles().length > 0) {
      this.seleccionarPerfilSugerido();
      return;
    }

    this.cargandoPerfiles.set(true);
    this.perfilService
      .listarActivos()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoPerfiles.set(false)),
      )
      .subscribe({
        next: (lista) => {
          this.perfiles.set(lista);
          this.seleccionarPerfilSugerido();
        },
        error: () => {
          this.errorGeneral.set('No se pudieron cargar los perfiles disponibles del sistema.');
        },
      });
  }

  private seleccionarPerfilSugerido(): void {
    const lista = this.perfiles();
    if (lista.length === 0) return;

    if (this.tipo() === 'JEFE') {
      const perfilJefe = lista.find(
        (p) =>
          p.nombre.toUpperCase().includes('JEFE') ||
          p.nombre.toUpperCase().includes('ADMINISTRADOR'),
      );
      this.form.patchValue({ idPerfil: perfilJefe ? perfilJefe.id : lista[0].id });
    } else {
      const perfilAlmacen = lista.find(
        (p) =>
          p.nombre.toUpperCase().includes('ALMACEN') ||
          p.nombre.toUpperCase().includes('USUARIO'),
      );
      this.form.patchValue({ idPerfil: perfilAlmacen ? perfilAlmacen.id : lista[0].id });
    }
  }

  isFieldInvalid(fieldName: keyof CrearUsuarioFormControls): boolean {
    const ctrl = this.form.get(fieldName);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  clavesNoCoinciden(): boolean {
    return (
      this.form.hasError('passwordMismatch') &&
      !!(
        this.form.get('confirmarClave')?.touched &&
        this.form.get('confirmarClave')?.value
      )
    );
  }

  toggleMostrarClave(): void {
    this.mostrarClave.update((v) => !v);
  }

  toggleMostrarConfirmarClave(): void {
    this.mostrarConfirmarClave.update((v) => !v);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.guardando()) {
      this.onCerrar();
    }
  }

  onCerrar(): void {
    if (this.guardando()) return;
    this.cerrar.emit();
  }

  onSubmit(): void {
    if (this.guardando()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const p = this.persona();
    if (!p) return;

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const formVal = this.form.getRawValue();
    const payload: CrearUsuarioEncargadoRequest = {
      usuario: formVal.usuario.trim(),
      clave: formVal.clave,
      correo: formVal.correo.trim() ? formVal.correo.trim() : null,
      telefono: formVal.telefono.trim() ? formVal.telefono.trim() : null,
      idPerfil: formVal.idPerfil!,
    };

    const peticion$: Observable<unknown> =
      this.tipo() === 'JEFE'
        ? this.encargadoService.crearUsuario(p.id, payload)
        : this.encargadoAlmacenService.crearUsuario(p.id, payload);

    peticion$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.notificationService.toast(
            `Cuenta de usuario "${payload.usuario}" creada y vinculada con éxito.`,
          );
          this.guardado.emit();
          this.onCerrar();
        },
        error: (err: unknown) => {
          const msg = extraerMensajeError(
            err,
            'No se pudo crear la cuenta de usuario. Verifique los datos ingresados.',
          );
          this.errorGeneral.set(msg);
        },
      });
  }
}
