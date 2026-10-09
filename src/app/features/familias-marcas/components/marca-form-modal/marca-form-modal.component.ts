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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCircleAlert, LucideLoader2, LucideSave, LucideX } from '@lucide/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { catalogErrorMessage } from '../../services/catalog-error';
import { ApiResponse } from '../../../../core/models';
import { MarcaResponse } from '../../models';
import { MarcaService } from '../../services';

interface MarcaForm {
  nombre: FormControl<string>;
}

@Component({
  selector: 'app-marca-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './marca-form-modal.component.html',
})
export class MarcaFormModalComponent {
  private readonly marcaService = inject(MarcaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly marca = input<MarcaResponse | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<MarcaResponse>>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.marca());

  readonly form = new FormGroup<MarcaForm>({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
  });

  constructor() {
    effect(() => {
      const m = this.marca();
      const isVisible = this.visible();

      if (isVisible) {
        this.errorGeneral.set(null);
        if (m) {
          this.form.reset({
            nombre: m.nombre,
          });
        } else {
          this.form.reset({
            nombre: '',
          });
        }
      }
    });
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
    this.errorGeneral.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre.trim(),
    };

    if (!payload.nombre) {
      this.errorGeneral.set('El nombre de la marca es obligatorio.');
      return;
    }

    this.guardando.set(true);

    const marcaActual = this.marca();
    const request$ =
      this.isEdit() && marcaActual
        ? this.marcaService.actualizar(marcaActual.id, payload)
        : this.marcaService.crear(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (resultado) => {
          this.guardado.emit(resultado);
        },
        error: (err: unknown) => {
          this.errorGeneral.set(
            catalogErrorMessage(err, 'Ocurrió un error al guardar la marca. Intente nuevamente.'),
          );
        },
      });
  }

  isFieldInvalid(field: keyof MarcaForm): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
