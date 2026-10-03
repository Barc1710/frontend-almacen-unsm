import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCircleAlert, LucideLoader2, LucideSave, LucideX } from '@lucide/angular';
import { catchError, finalize, of, switchMap } from 'rxjs';
import {
  Articulo,
  Familia,
  Marca,
  Ubicacion,
  UnidadMedida,
} from '../../models';
import { ArticuloService } from '../../services';

interface ArticuloForm {
  codigo: FormControl<string>;
  descripcion: FormControl<string>;
  idFamilia: FormControl<number | null>;
  idMarca: FormControl<number | null>;
  idUbicacion: FormControl<number | null>;
  idUnidadMedida: FormControl<number | null>;
  precio: FormControl<number | null>;
  cantidadMinima: FormControl<number | null>;
  detalle: FormControl<string>;
}

@Component({
  selector: 'app-articulo-form',
  imports: [ReactiveFormsModule, LucideX, LucideSave, LucideLoader2, LucideCircleAlert],
  templateUrl: './articulo-form.component.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ArticuloFormComponent {
  private readonly articuloService = inject(ArticuloService);

  readonly visible = input<boolean>(false);
  readonly articulo = input<Articulo | null>(null);
  readonly familias = input<Familia[]>([]);
  readonly marcas = input<Marca[]>([]);
  readonly ubicaciones = input<Ubicacion[]>([]);
  readonly unidadesMedida = input<UnidadMedida[]>([]);

  readonly cerrar = output<void>();
  readonly guardado = output<Articulo>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly conflictoCodigo = signal<string | null>(null);
  readonly cargandoCodigo = signal<boolean>(false);

  readonly isEdit = computed(() => !!this.articulo());

  readonly form = new FormGroup<ArticuloForm>({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    idFamilia: new FormControl(null, { validators: [Validators.required] }),
    idMarca: new FormControl(null, { validators: [Validators.required] }),
    idUbicacion: new FormControl(null, { validators: [Validators.required] }),
    idUnidadMedida: new FormControl(null),
    precio: new FormControl(0, { validators: [Validators.min(0)] }),
    cantidadMinima: new FormControl(10, {
      validators: [Validators.required, Validators.min(0)],
    }),
    detalle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  constructor() {
    this.form.controls.idFamilia.valueChanges
      .pipe(
        takeUntilDestroyed(),
        switchMap((idFam) => {
          if (!this.isEdit() && this.visible() && idFam) {
            this.cargandoCodigo.set(true);
            this.conflictoCodigo.set(null);
            return this.articuloService.obtenerSiguienteCodigo(Number(idFam)).pipe(
              catchError(() => of('')),
              finalize(() => this.cargandoCodigo.set(false)),
            );
          }
          if (!this.isEdit()) {
            this.form.controls.codigo.setValue('');
          }
          return of(null);
        }),
      )
      .subscribe((siguienteCodigo) => {
        if (siguienteCodigo) {
          this.form.controls.codigo.setValue(siguienteCodigo);
          this.form.controls.codigo.markAsDirty();
        }
      });

    effect(() => {
      const art = this.articulo();
      const isVisible = this.visible();

      if (isVisible) {
        this.errorGeneral.set(null);
        this.conflictoCodigo.set(null);
        this.cargandoCodigo.set(false);

        if (art) {
          this.form.patchValue({
            codigo: art.codigo,
            descripcion: art.descripcion,
            idFamilia: art.idFamilia,
            idMarca: art.idMarca,
            idUbicacion: art.idUbicacion,
            idUnidadMedida: art.idUnidadMedida,
            precio: art.precio,
            cantidadMinima: art.cantidadMinima,
            detalle: art.detalle ?? '',
          });
          this.form.controls.codigo.disable();
        } else {
          this.form.reset({
            codigo: '',
            descripcion: '',
            idFamilia: null,
            idMarca: null,
            idUbicacion: null,
            idUnidadMedida: null,
            precio: 0,
            cantidadMinima: 10,
            detalle: '',
          });
          this.form.controls.codigo.enable();
        }
      }
    });
  }

  onEscape(): void {
    if (this.visible() && !this.guardando()) {
      this.onCerrar();
    }
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

    this.conflictoCodigo.set(null);
    this.errorGeneral.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.guardando.set(true);

    const baseData = {
      descripcion: raw.descripcion.trim(),
      idFamilia: Number(raw.idFamilia),
      idMarca: Number(raw.idMarca),
      idUbicacion: Number(raw.idUbicacion),
      idUnidadMedida: raw.idUnidadMedida ? Number(raw.idUnidadMedida) : null,
      cantidadMinima: Number(raw.cantidadMinima),
      detalle: raw.detalle.trim() || null,
    };

    const currentArt = this.articulo();
    const save$ =
      this.isEdit() && currentArt
        ? this.articuloService.actualizar(currentArt.id, {
            ...baseData,
            precio: Number(raw.precio),
          })
        : this.articuloService.crear({
            ...baseData,
            codigo: raw.codigo.trim().toUpperCase(),
            precio: 0.0,
          });

    save$.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.guardado.emit(guardado);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.handleSaveError(err);
      },
    });
  }

  isFieldInvalid(field: keyof ArticuloForm): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  private handleSaveError(err: unknown): void {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      const httpErr = err as { status?: number; error?: unknown };
      if (httpErr.status === 409) {
        this.conflictoCodigo.set(
          this.extractErrorMessage(
            httpErr.error,
            'El código ingresado ya está asignado a otro artículo.',
          ),
        );
        this.form.controls.codigo.markAsTouched();
        return;
      }
    }

    const errorBody =
      typeof err === 'object' && err !== null && 'error' in err
        ? (err as { error?: unknown }).error
        : err;

    this.errorGeneral.set(
      this.extractErrorMessage(errorBody, 'Ocurrió un error al procesar la solicitud.'),
    );
  }

  private extractErrorMessage(errorBody: unknown, fallback: string): string {
    if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
      return errorBody;
    }
    if (typeof errorBody === 'object' && errorBody !== null) {
      const cand = errorBody as { message?: string; mensaje?: string };
      return cand.mensaje || cand.message || fallback;
    }
    return fallback;
  }
}
