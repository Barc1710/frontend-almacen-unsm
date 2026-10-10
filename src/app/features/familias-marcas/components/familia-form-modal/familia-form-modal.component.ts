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
import { catchError, EMPTY, finalize, Subject, switchMap, timer } from 'rxjs';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { catalogErrorMessage } from '../../services/catalog-error';
import { ApiResponse } from '../../../../core/models';
import { FamiliaResponse } from '../../models';
import { FamiliaService } from '../../services';

interface FamiliaForm {
  nombre: FormControl<string>;
  inicial: FormControl<string>;
}

@Component({
  selector: 'app-familia-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucideCircleAlert,
  ],
  templateUrl: './familia-form-modal.component.html',
})
export class FamiliaFormModalComponent {
  private readonly familiaService = inject(FamiliaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sugerencias = new Subject<string | null>();

  readonly visible = input<boolean>(false);
  readonly familia = input<FamiliaResponse | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<ApiResponse<FamiliaResponse>>();

  readonly guardando = signal<boolean>(false);
  readonly sugiriendoInicial = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly isEdit = computed(() => !!this.familia());

  /** Bandera que registra si el usuario modificó manualmente la inicial para no sobreescribirla */
  private inicialModificadoManual = false;

  readonly form = new FormGroup<FamiliaForm>({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    inicial: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        (control) => {
          const val = (control.value || '').trim().toUpperCase();
          if (!val) return { required: true };
          const fam = this.familia();
          // Permitir inicial histórica (hasta 10 caracteres) si no se modifica en edición
          if (fam && val === fam.inicial.trim().toUpperCase() && val.length <= 10) {
            return null;
          }
          if (val.length > 2 || !/^[A-Za-z]{1,2}$/.test(val)) {
            return { invalidInicial: true };
          }
          return null;
        },
      ],
    }),
  });

  constructor() {
    this.sugerencias
      .pipe(
        switchMap((nombre) => {
          if (nombre === null) return EMPTY;
          return timer(250).pipe(
            switchMap(() => this.familiaService.sugerirInicial(nombre)),
            catchError((error: unknown) => {
              this.errorGeneral.set(
                catalogErrorMessage(
                  error,
                  'No se pudo sugerir una inicial. Puede ingresarla manualmente o volver a intentarlo.',
                ),
              );
              return EMPTY;
            }),
            finalize(() => this.sugiriendoInicial.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((inicial) => {
        if (this.visible() && !this.isEdit() && !this.inicialModificadoManual) {
          this.form.controls.inicial.setValue(inicial, { emitEvent: false });
        }
      });

    this.form.controls.nombre.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.solicitarInicial());

    effect(() => {
      const fam = this.familia();
      const visible = this.visible();
      this.cancelarSugerencia();
      if (visible) {
        this.errorGeneral.set(null);
        this.inicialModificadoManual = false;
        this.form.reset(
          { nombre: fam?.nombre ?? '', inicial: fam?.inicial ?? '' },
          { emitEvent: false },
        );
      }
    });
  }

  private cancelarSugerencia(): void {
    this.sugerencias.next(null);
    this.sugiriendoInicial.set(false);
  }

  private solicitarInicial(): void {
    this.cancelarSugerencia();
    if (!this.visible() || this.isEdit() || this.inicialModificadoManual) return;
    const nombre = this.form.controls.nombre.value.trim();
    this.form.controls.inicial.setValue('', { emitEvent: false });
    this.errorGeneral.set(null);
    if (!nombre) return;
    // El bloqueo empieza antes del debounce, no después de iniciar el HTTP.
    this.sugiriendoInicial.set(true);
    this.sugerencias.next(nombre);
  }

  onInicialInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.cancelarSugerencia();
    const original = this.familia()?.inicial ?? '';
    const upper = element.value.toUpperCase().trim();
    const value =
      upper === original.toUpperCase() ? upper : upper.replace(/[^A-Z]/g, '').slice(0, 2);
    element.value = value;
    this.form.controls.inicial.setValue(value, { emitEvent: false });
    this.inicialModificadoManual = value.length > 0;
    if (!value) this.solicitarInicial();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.guardando()) {
      this.onCerrar();
    }
  }

  onCerrar(): void {
    if (this.guardando()) return;
    this.cancelarSugerencia();
    this.cerrar.emit();
  }

  onSubmit(): void {
    if (this.guardando() || this.sugiriendoInicial()) return;
    this.errorGeneral.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre.trim(),
      inicial: raw.inicial.trim().toUpperCase(),
    };

    if (!payload.nombre || !payload.inicial) {
      this.errorGeneral.set('Por favor complete todos los campos requeridos.');
      return;
    }

    this.guardando.set(true);

    const famActual = this.familia();
    const request$ =
      this.isEdit() && famActual
        ? this.familiaService.actualizar(famActual.id, payload)
        : this.familiaService.crear(payload);

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
            catalogErrorMessage(err, 'Ocurrió un error al guardar la familia. Intente nuevamente.'),
          );
        },
      });
  }

  isFieldInvalid(field: keyof FamiliaForm): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
