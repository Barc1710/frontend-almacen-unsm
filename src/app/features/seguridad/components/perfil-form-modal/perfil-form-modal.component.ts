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
import { NotificationService } from '../../../../core/services';
import { extraerMensajeError } from '../../../../core/utils';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Perfil } from '../../models';
import { PerfilService } from '../../services';

@Component({
  selector: 'app-perfil-form-modal',
  imports: [
    ReactiveFormsModule,
    ModalDialogDirective,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './perfil-form-modal.component.html',
})
export class PerfilFormModalComponent {
  private readonly perfilService = inject(PerfilService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly perfil = input<Perfil | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.perfil());

  readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.maxLength(100),
        (c) => (c.value && c.value.trim().length > 0 ? null : { required: true }),
      ],
    }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const p = this.perfil();
        this.errorGeneral.set(null);
        this.guardando.set(false);

        if (p) {
          this.form.reset({ nombre: p.nombre });
        } else {
          this.form.reset({ nombre: '' });
        }
      }
    });
  }

  isFieldInvalid(): boolean {
    const ctrl = this.form.controls.nombre;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
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

    const nombre = this.form.controls.nombre.value.trim().toUpperCase();
    this.guardando.set(true);
    this.errorGeneral.set(null);

    const actual = this.perfil();
    const request$ = actual
      ? this.perfilService.actualizar(actual.id, { nombre })
      : this.perfilService.crear({ nombre });

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.notificationService.toast(
            actual ? 'Perfil actualizado con éxito' : 'Perfil creado con éxito',
          );
          this.guardado.emit();
        },
        error: (err: unknown) => {
          this.errorGeneral.set(
            extraerMensajeError(err, 'Error al procesar el perfil. Verifique los datos.'),
          );
        },
      });
  }
}
