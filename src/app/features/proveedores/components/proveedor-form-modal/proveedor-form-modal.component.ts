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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  LucideCircleAlert,
  LucideLoader2,
  LucideSave,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Proveedor, ProveedorRequest } from '../../models';
import { ProveedorService } from '../../services';

interface ProveedorFormControls {
  razonSocial: FormControl<string>;
  ruc: FormControl<string>;
  contacto: FormControl<string>;
  telefono: FormControl<string>;
  correo: FormControl<string>;
  direccion: FormControl<string>;
  banco: FormControl<string>;
  cuentaCorriente: FormControl<string>;
}

@Component({
  selector: 'app-proveedor-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './proveedor-form-modal.component.html',
})
export class ProveedorFormModalComponent {
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly proveedor = input<Proveedor | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<Proveedor>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.proveedor());

  readonly form = new FormGroup<ProveedorFormControls>({
    razonSocial: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(150),
        (c) => (c.value && c.value.trim().length > 0 ? null : { required: true }),
      ],
    }),
    ruc: new FormControl('', {
      nonNullable: true,
      validators: [
        (control) => {
          const val = (control.value || '').trim();
          if (!val) return null;
          return /^\d{11}$/.test(val) ? null : { invalidRuc: true };
        },
      ],
    }),
    contacto: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
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
    banco: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    cuentaCorriente: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const p = this.proveedor();
        this.errorGeneral.set(null);
        this.guardando.set(false);

        if (p) {
          this.form.reset({
            razonSocial: p.razonSocial,
            ruc: p.ruc ?? '',
            contacto: p.contacto ?? '',
            telefono: p.telefono ?? '',
            correo: p.correo ?? '',
            direccion: p.direccion ?? '',
            banco: p.banco ?? '',
            cuentaCorriente: p.cuentaCorriente ?? '',
          });
        } else {
          this.form.reset({
            razonSocial: '',
            ruc: '',
            contacto: '',
            telefono: '',
            correo: '',
            direccion: '',
            banco: '',
            cuentaCorriente: '',
          });
        }
      }
    });
  }

  isFieldInvalid(field: keyof ProveedorFormControls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onRucInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const clean = target.value.replace(/\D/g, '').slice(0, 11);
    this.form.controls.ruc.setValue(clean, { emitEvent: false });
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

    const payload: ProveedorRequest = {
      razonSocial: val.razonSocial.trim(),
      ruc: val.ruc.trim() || null,
      contacto: val.contacto.trim() || null,
      telefono: val.telefono.trim() || null,
      correo: val.correo.trim() || null,
      direccion: val.direccion.trim() || null,
      banco: val.banco.trim() || null,
      cuentaCorriente: val.cuentaCorriente.trim() || null,
    };

    const actual = this.proveedor();
    const request$ = actual
      ? this.proveedorService.actualizar(actual.id, payload)
      : this.proveedorService.crear(payload);

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
    let mensaje = 'Ocurrió un error al procesar el proveedor. Verifique los campos ingresados.';
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
