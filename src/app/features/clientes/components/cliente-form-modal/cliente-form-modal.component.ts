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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCircleAlert, LucideLoader2, LucideSave, LucideX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Cliente, ClienteRequest } from '../../models';
import { ClienteService } from '../../services';

interface ClienteFormControls {
  nombre: FormControl<string>;
  dni: FormControl<string>;
  telefono: FormControl<string>;
  correo: FormControl<string>;
  direccion: FormControl<string>;
}

@Component({
  selector: 'app-cliente-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './cliente-form-modal.component.html',
})
export class ClienteFormModalComponent {
  private readonly clienteService = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly cliente = input<Cliente | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<Cliente>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.cliente());

  readonly form = new FormGroup<ClienteFormControls>({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(150),
        (c) => (c.value && c.value.trim().length > 0 ? null : { required: true }),
      ],
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
    telefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.maxLength(100),
        (control) => {
          const val = (control.value || '').trim();
          if (!val) return null;
          return Validators.email(control);
        },
      ],
    }),
    direccion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const c = this.cliente();
        this.errorGeneral.set(null);
        this.guardando.set(false);

        if (c) {
          this.form.reset({
            nombre: c.nombre,
            dni: c.dni ?? '',
            telefono: c.telefono ?? '',
            correo: c.correo ?? '',
            direccion: c.direccion ?? '',
          });
        } else {
          this.form.reset({
            nombre: '',
            dni: '',
            telefono: '',
            correo: '',
            direccion: '',
          });
        }
      }
    });
  }

  isFieldInvalid(field: keyof ClienteFormControls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onDniInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const clean = target.value.replace(/\D/g, '').slice(0, 8);
    this.form.controls.dni.setValue(clean, { emitEvent: false });
    target.value = clean;
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

    const payload: ClienteRequest = {
      nombre: val.nombre.trim(),
      dni: val.dni.trim() || null,
      telefono: val.telefono.trim() || null,
      correo: val.correo.trim() || null,
      direccion: val.direccion.trim() || null,
    };

    const actual = this.cliente();
    const request$ = actual
      ? this.clienteService.actualizar(actual.id, payload)
      : this.clienteService.crear(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (res) => this.guardado.emit(res),
        error: (err: unknown) => this.procesarError(err),
      });
  }

  private procesarError(err: unknown): void {
    let mensaje = 'Ocurrió un error al procesar el cliente. Verifique los campos ingresados.';
    if (err && typeof err === 'object') {
      const e = err as { error?: { message?: string; mensaje?: string; error?: string } };
      if (e.error?.message) {
        mensaje = e.error.message;
      } else if (e.error?.mensaje) {
        mensaje = e.error.mensaje;
      } else if (e.error?.error) {
        mensaje = e.error.error;
      }
    }
    this.errorGeneral.set(mensaje);
  }
}
