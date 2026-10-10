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
import { Encargado, EncargadoRequest } from '../../models';
import { EncargadoService } from '../../services';

interface EncargadoForm {
  siglaProfesion: FormControl<string>;
  nombres: FormControl<string>;
  apellidos: FormControl<string>;
  dni: FormControl<string>;
  cargo: FormControl<string>;
}

@Component({
  selector: 'app-encargado-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './encargado-form-modal.component.html',
})
export class EncargadoFormModalComponent {
  private readonly encargadoService = inject(EncargadoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly encargado = input<Encargado | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<Encargado>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.encargado());

  readonly form = new FormGroup<EncargadoForm>({
    siglaProfesion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(20)],
    }),
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
    cargo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const enc = this.encargado();
        this.errorGeneral.set(null);
        this.guardando.set(false);

        if (enc) {
          this.form.reset({
            siglaProfesion: enc.siglaProfesion ?? '',
            nombres: enc.nombres ?? '',
            apellidos: enc.apellidos ?? '',
            dni: enc.dni ?? '',
            cargo: enc.cargo ?? '',
          });
        } else {
          this.form.reset({
            siglaProfesion: '',
            nombres: '',
            apellidos: '',
            dni: '',
            cargo: '',
          });
        }
      }
    });
  }

  isFieldInvalid(field: keyof EncargadoForm): boolean {
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
    const payload: EncargadoRequest = {
      siglaProfesion: val.siglaProfesion.trim() || null,
      nombres: val.nombres.trim(),
      apellidos: val.apellidos.trim(),
      dni: val.dni.trim() || null,
      cargo: val.cargo.trim() || null,
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const actual = this.encargado();
    const request$ = actual
      ? this.encargadoService.actualizar(actual.id, payload)
      : this.encargadoService.crear(payload);

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
              : 'Error al procesar la solicitud del encargado. Revise los datos ingresados.';
          this.errorGeneral.set(mensaje);
        },
      });
  }
}
