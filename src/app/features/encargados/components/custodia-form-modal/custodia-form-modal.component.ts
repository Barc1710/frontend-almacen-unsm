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
import {
  LucideCircleAlert,
  LucideLoader2,
  LucideSave,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../../core/models';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { EncargadoAlmacen, EncargadoAlmacenRequest } from '../../models';
import { EncargadoAlmacenService } from '../../services';

interface CustodiaForm {
  nombres: FormControl<string>;
  apellidos: FormControl<string>;
  dni: FormControl<string>;
  esTitular: FormControl<boolean>;
}

@Component({
  selector: 'app-custodia-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './custodia-form-modal.component.html',
})
export class CustodiaFormModalComponent {
  private readonly encargadoAlmacenService = inject(EncargadoAlmacenService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly personal = input<EncargadoAlmacen | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<EncargadoAlmacen>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.personal());

  readonly form = new FormGroup<CustodiaForm>({
    nombres: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(100),
        (c) => (c.value && c.value.trim().length > 0 ? null : { required: true }),
      ],
    }),
    apellidos: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(100),
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
    esTitular: new FormControl(false, {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const p = this.personal();
        this.errorGeneral.set(null);
        this.guardando.set(false);

        if (p) {
          this.form.reset({
            nombres: p.nombres ?? '',
            apellidos: p.apellidos ?? '',
            dni: p.dni ?? '',
            esTitular: p.esTitular ?? false,
          });
        } else {
          this.form.reset({
            nombres: '',
            apellidos: '',
            dni: '',
            esTitular: false,
          });
        }
      }
    });
  }

  isFieldInvalid(field: keyof CustodiaForm): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onDniInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const clean = target.value.replace(/\D/g, '').slice(0, 8);
    this.form.controls.dni.setValue(clean, { emitEvent: false });
    target.value = clean;
  }

  toggleTitular(): void {
    const current = this.form.controls.esTitular.value;
    this.form.controls.esTitular.setValue(!current);
    this.form.controls.esTitular.markAsDirty();
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
    const payload: EncargadoAlmacenRequest = {
      nombres: val.nombres.trim(),
      apellidos: val.apellidos.trim(),
      dni: val.dni.trim() || null,
      esTitular: val.esTitular,
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const actual = this.personal();
    const request$ = actual
      ? this.encargadoAlmacenService.actualizar(actual.id, payload)
      : this.encargadoAlmacenService.crear(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.guardado.emit(res);
        },
        error: (err: unknown) => {
          const mensaje =
            err && typeof err === 'object' && 'error' in err && typeof (err as any).error === 'object' && (err as any).error?.mensaje
              ? (err as any).error.mensaje
              : 'Error al procesar el registro del personal de custodia.';
          this.errorGeneral.set(mensaje);
        },
      });
  }
}
