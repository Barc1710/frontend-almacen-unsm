import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  LucideAlertCircle,
  LucideChevronDown,
  LucideCircleAlert,
  LucideLoader2,
  LucidePlus,
  LucideSave,
  LucideSearch,
  LucideTrash,
  LucideX,
} from '@lucide/angular';
import { catchError, debounceTime, of, Subject, Subscription, switchMap } from 'rxjs';
import { ArticuloResumen } from '../../../articulos';
import {
  Area,
  Cliente,
  DetalleEgresoRequest,
  EgresoConDetalles,
  EgresoCreateRequest,
  Encargado,
  EncargadoAlmacen,
  TipoEgreso,
} from '../../models';
import { EgresoService } from '../../services';
import { AuthService } from '../../../../core';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';

export interface FilaEgresoDetalle {
  readonly id: string;
  articulo: ArticuloResumen | null;
  idArticulo: number | null;
  codigoArticulo: string;
  descripcionArticulo: string;
  simboloUnidadMedida: string;
  permiteDecimales: boolean;
  saldo: number;
  precio: number;
  cantidad: number;
  busquedaTexto: string;
  buscando: boolean;
  sugerencias: ArticuloResumen[];
  mostrarSugerencias: boolean;
  errorBusqueda: string | null;
  errorArticulo?: string | null;
  errorCantidad?: string | null;
}

interface CabeceraEgresoForm {
  tipoEgreso: FormControl<TipoEgreso>;
  idCliente: FormControl<number | null>;
  idArea: FormControl<number | null>;
  ambiente: FormControl<string>;
  idEncargado: FormControl<number | null>;
  idEncargadoAlmacen: FormControl<number | null>;
  motivoBaja: FormControl<string>;
}

@Component({
  selector: 'app-egreso-form-modal',
  imports: [
    ModalDialogDirective,
    ReactiveFormsModule,
    FormsModule,
    DecimalPipe,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucidePlus,
    LucideTrash,
    LucideSearch,
    LucideChevronDown,
    LucideCircleAlert,
    LucideAlertCircle,
  ],
  templateUrl: './egreso-form-modal.component.html',
})
export class EgresoFormModalComponent {
  readonly esAdministrador = inject(AuthService).isAdmin;
  private readonly egresoService = inject(EgresoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly clientes = input<Cliente[]>([]);
  readonly areas = input<Area[]>([]);
  readonly encargados = input<Encargado[]>([]);
  readonly encargadosAlmacen = input<EncargadoAlmacen[]>([]);

  readonly cerrar = output<void>();
  readonly guardado = output<EgresoConDetalles>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly alertaDuplicado = signal<string | null>(null);
  readonly siguienteNumero = signal<string>('');

  readonly filas = signal<FilaEgresoDetalle[]>([]);
  private readonly busquedaSubjects = new Map<string, Subject<string>>();
  private readonly busquedaSubscriptions = new Map<string, Subscription>();

  readonly cabeceraForm = new FormGroup<CabeceraEgresoForm>({
    tipoEgreso: new FormControl<TipoEgreso>('DESPACHO_ORDINARIO', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    idCliente: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    idArea: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    ambiente: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    idEncargado: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    idEncargadoAlmacen: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    motivoBaja: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  /**
   * Lista todos los encargados de almacén activos (titulares y no titulares).
   */
  readonly encargadosAlmacenActivos = computed<EncargadoAlmacen[]>(() => {
    return this.encargadosAlmacen()
      .filter((e) => e.estado !== '0')
      .sort((a, b) => (b.esTitular ? 1 : 0) - (a.esTitular ? 1 : 0));
  });

  /**
   * Cantidad de renglones válidos con artículo seleccionado.
   */
  readonly totalArticulos = computed(() => {
    return this.filas().filter((f) => f.articulo !== null && f.idArticulo !== null).length;
  });

  /**
   * Suma total de unidades físicas a despachar.
   */
  readonly totalCantidad = computed(() => {
    return this.filas()
      .filter((f) => f.articulo !== null && f.idArticulo !== null)
      .reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0);
  });

  /**
   * Verifica si alguna fila excede existencias o tiene errores de validación de cantidad.
   */
  readonly hayErroresDeStock = computed(() => {
    return this.filas().some(
      (f) =>
        f.articulo !== null &&
        (f.errorCantidad !== null ||
          (Number(f.cantidad) || 0) > f.saldo ||
          (Number(f.cantidad) || 0) <= 0),
    );
  });

  /**
   * Tipo de operación reactivo (Despacho vs Baja).
   */
  readonly tipoOperacion = signal<TipoEgreso>('DESPACHO_ORDINARIO');

  /**
   * Indica si la operación seleccionada corresponde a una baja por deterioro.
   */
  readonly esOperacionBaja = computed(() => {
    return this.tipoOperacion() !== 'DESPACHO_ORDINARIO';
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        untracked(() => {
          this.resetearFormulario();
          this.cargarSiguienteNumero();
        });
      }
    });

    effect(() => {
      const lista = this.encargadosAlmacenActivos();
      if (this.visible() && !this.cabeceraForm.controls.idEncargadoAlmacen.value) {
        untracked(() => {
          const titular =
            lista.find((e) => e.esTitular) || (lista.length === 1 ? lista[0] : null);
          if (titular) {
            this.cabeceraForm.controls.idEncargadoAlmacen.setValue(titular.id);
          }
        });
      }
    });

    effect(() => {
      const listaEnc = this.encargados().filter((e) => e.estado !== '0');
      if (this.visible() && !this.cabeceraForm.controls.idEncargado.value && listaEnc.length === 1) {
        untracked(() => {
          this.cabeceraForm.controls.idEncargado.setValue(listaEnc[0].id);
        });
      }
    });
  }

  cargarSiguienteNumero(): void {
    this.egresoService
      .obtenerSiguienteNumero()
      .pipe(
        catchError(() => of('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((num) => this.siguienteNumero.set(num));
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

  setTipoOperacion(tipo: TipoEgreso): void {
    if (this.guardando() || (tipo !== 'DESPACHO_ORDINARIO' && !this.esAdministrador())) return;
    this.tipoOperacion.set(tipo);
    this.cabeceraForm.controls.tipoEgreso.setValue(tipo);

    const isBaja = tipo !== 'DESPACHO_ORDINARIO';
    const idCliente = this.cabeceraForm.controls.idCliente;
    const idArea = this.cabeceraForm.controls.idArea;
    const idEncargado = this.cabeceraForm.controls.idEncargado;
    const ambiente = this.cabeceraForm.controls.ambiente;
    const motivoBaja = this.cabeceraForm.controls.motivoBaja;

    if (isBaja) {
      idCliente.clearValidators();
      idCliente.setValue(null);
      idArea.clearValidators();
      idArea.setValue(null);
      idEncargado.clearValidators();
      idEncargado.setValue(null);
      ambiente.clearValidators();
      ambiente.setValue('');
      motivoBaja.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]);
    } else {
      idCliente.setValidators([Validators.required]);
      idArea.setValidators([Validators.required]);
      idEncargado.setValidators([Validators.required]);
      ambiente.setValidators([Validators.maxLength(100)]);
      motivoBaja.clearValidators();
      motivoBaja.setValue('');
    }

    idCliente.updateValueAndValidity();
    idArea.updateValueAndValidity();
    idEncargado.updateValueAndValidity();
    ambiente.updateValueAndValidity();
    motivoBaja.updateValueAndValidity();
  }

  agregarFila(): void {
    const nuevaFila: FilaEgresoDetalle = {
      id: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      articulo: null,
      idArticulo: null,
      codigoArticulo: '',
      descripcionArticulo: '',
      simboloUnidadMedida: 'UND',
      permiteDecimales: false,
      saldo: 0,
      precio: 0,
      cantidad: 1,
      busquedaTexto: '',
      buscando: false,
      sugerencias: [],
      mostrarSugerencias: false,
      errorBusqueda: null,
      errorArticulo: null,
      errorCantidad: null,
    };

    this.conectarBusquedaFila(nuevaFila);
    this.filas.update((actuales) => [...actuales, nuevaFila]);
  }

  eliminarFila(index: number): void {
    const listaActual = this.filas();
    if (index >= 0 && index < listaActual.length) {
      const fila = listaActual[index];
      this.busquedaSubscriptions.get(fila.id)?.unsubscribe();
      this.busquedaSubscriptions.delete(fila.id);
      this.busquedaSubjects.get(fila.id)?.complete();
      this.busquedaSubjects.delete(fila.id);

      const nuevaLista = listaActual.filter((_, idx) => idx !== index);
      if (nuevaLista.length === 0) {
        this.filas.set([]);
        this.agregarFila();
      } else {
        this.filas.set(nuevaLista);
      }
    }
  }

  onBuscarArticuloInput(fila: FilaEgresoDetalle, texto: string): void {
    fila.busquedaTexto = texto;
    fila.errorArticulo = null;
    this.alertaDuplicado.set(null);
    fila.mostrarSugerencias = true;

    let subject = this.busquedaSubjects.get(fila.id);
    if (!subject) {
      this.conectarBusquedaFila(fila);
      subject = this.busquedaSubjects.get(fila.id);
    }
    subject?.next(texto);
  }

  onFocusArticulo(fila: FilaEgresoDetalle): void {
    fila.mostrarSugerencias = true;
    if (fila.sugerencias.length === 0 && !fila.busquedaTexto) {
      let subject = this.busquedaSubjects.get(fila.id);
      if (!subject) {
        this.conectarBusquedaFila(fila);
        subject = this.busquedaSubjects.get(fila.id);
      }
      subject?.next('');
    }
  }

  seleccionarArticulo(fila: FilaEgresoDetalle, art: ArticuloResumen): void {
    // 1. Integridad: Validar que no esté repetido en otra fila
    const yaExiste = this.filas().some((f) => f.id !== fila.id && f.idArticulo === art.id);

    if (yaExiste) {
      fila.errorArticulo = `El artículo [${art.codigo}] ya figura en el detalle.`;
      this.alertaDuplicado.set(
        `El artículo "${art.codigo} - ${art.descripcion}" ya está presente en otra fila del comprobante.`,
      );
      fila.mostrarSugerencias = false;
      return;
    }

    fila.articulo = art;
    fila.idArticulo = art.id;
    fila.codigoArticulo = art.codigo;
    fila.descripcionArticulo = art.descripcion;
    fila.simboloUnidadMedida = art.simboloUnidadMedida || 'UND';
    fila.permiteDecimales = art.permiteDecimales === true;
    fila.saldo = Number(art.saldo) || 0;
    fila.precio = Number(art.precio) || 0;

    // Cantidad inicial inteligente (1 o el saldo si es menor a 1)
    const cantidadInicial = fila.saldo > 0 ? (fila.saldo >= 1 ? 1 : fila.saldo) : 1;
    fila.cantidad = cantidadInicial;

    fila.busquedaTexto = '';
    fila.mostrarSugerencias = false;
    fila.sugerencias = [];
    fila.errorArticulo = null;

    // Validar existencias inmediatamente
    this.validarExistenciasFila(fila);
    this.alertaDuplicado.set(null);
    this.filas.set([...this.filas()]);
  }

  limpiarArticuloEnFila(fila: FilaEgresoDetalle): void {
    fila.articulo = null;
    fila.idArticulo = null;
    fila.codigoArticulo = '';
    fila.descripcionArticulo = '';
    fila.simboloUnidadMedida = 'UND';
    fila.permiteDecimales = false;
    fila.saldo = 0;
    fila.precio = 0;
    fila.cantidad = 1;
    fila.busquedaTexto = '';
    fila.mostrarSugerencias = false;
    fila.sugerencias = [];
    fila.errorArticulo = null;
    fila.errorCantidad = null;
    this.alertaDuplicado.set(null);

    this.filas.set([...this.filas()]);
  }

  onCantidadInput(fila: FilaEgresoDetalle, nuevoValor: unknown): void {
    if (nuevoValor === null || nuevoValor === undefined || nuevoValor === '') {
      fila.cantidad = 0;
      fila.errorCantidad = 'La cantidad es requerida';
      this.filas.set([...this.filas()]);
      return;
    }

    const cant = Number(nuevoValor);
    if (!isNaN(cant)) {
      fila.cantidad = cant;
      this.validarExistenciasFila(fila);
      this.filas.set([...this.filas()]);
    }
  }

  onCantidadBlur(fila: FilaEgresoDetalle): void {
    let cant = Number(fila.cantidad);
    if (isNaN(cant) || cant <= 0) {
      fila.errorCantidad = 'Cantidad debe ser mayor a 0';
      this.filas.set([...this.filas()]);
      return;
    }

    if (!fila.permiteDecimales) {
      cant = Math.round(cant);
    } else {
      cant = Math.round(cant * 100) / 100;
    }

    fila.cantidad = cant;
    this.validarExistenciasFila(fila);
    this.filas.set([...this.filas()]);
  }

  private validarExistenciasFila(fila: FilaEgresoDetalle): void {
    if (!fila.articulo) {
      fila.errorCantidad = null;
      return;
    }

    const cant = Number(fila.cantidad);
    if (isNaN(cant) || cant <= 0) {
      fila.errorCantidad = 'Debe ser mayor a 0';
      return;
    }

    // Validación estricta de existencias: cantidad <= saldo
    if (cant > fila.saldo) {
      fila.errorCantidad = `Supera el saldo disponible (${fila.saldo} ${fila.simboloUnidadMedida})`;
      return;
    }

    // Validación de unidad de medida
    if (!fila.permiteDecimales && !Number.isInteger(cant)) {
      fila.errorCantidad = 'Solo admite números enteros';
      return;
    }

    if (fila.permiteDecimales) {
      const partes = String(cant).split('.');
      if (partes.length > 1 && partes[1].length > 2) {
        fila.errorCantidad = 'Máximo 2 decimales';
        return;
      }
    }

    fila.errorCantidad = null;
  }

  cerrarSugerencias(fila: FilaEgresoDetalle, event: FocusEvent): void {
    const contenedor = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && contenedor.contains(event.relatedTarget)) return;
    fila.mostrarSugerencias = false;
    this.filas.set([...this.filas()]);
  }

  isFieldInvalid(field: keyof CabeceraEgresoForm): boolean {
    const control = this.cabeceraForm.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  onSubmit(): void {
    if (this.guardando()) return;

    this.errorGeneral.set(null);
    this.alertaDuplicado.set(null);

    let hayErrores = false;

    // 1. Validar cabecera
    if (this.cabeceraForm.invalid) {
      this.cabeceraForm.markAllAsTouched();
      hayErrores = true;
    }

    // 2. Validar artículos y cantidades
    const listaFilas = this.filas();
    if (listaFilas.length === 0) {
      this.agregarFila();
      return;
    }

    for (const f of listaFilas) {
      if (!f.articulo || !f.idArticulo) {
        f.errorArticulo = 'Debe seleccionar un artículo con stock';
        hayErrores = true;
      } else {
        f.errorArticulo = null;
        this.validarExistenciasFila(f);
        if (f.errorCantidad) {
          hayErrores = true;
        }
      }
    }

    this.filas.set([...listaFilas]);

    if (hayErrores || this.hayErroresDeStock()) {
      return;
    }

    const filasValidas = listaFilas.filter((f) => f.articulo !== null && f.idArticulo !== null);
    if (filasValidas.length === 0) {
      this.errorGeneral.set('Debe ingresar al menos un artículo para despachar.');
      return;
    }

    this.guardando.set(true);

    const raw = this.cabeceraForm.getRawValue();

    const detallesRequest: DetalleEgresoRequest[] = filasValidas.map((f) => ({
      idArticulo: f.idArticulo!,
      cantidad: Number(f.cantidad),
    }));

    const esBaja = this.esOperacionBaja();
    const request: EgresoCreateRequest = {
      idCliente: !esBaja && raw.idCliente ? Number(raw.idCliente) : null,
      idEncargado: !esBaja && raw.idEncargado ? Number(raw.idEncargado) : null,
      nombreEncargadoLibre: null,
      tipoEgreso: this.tipoOperacion(),
      motivoBaja: esBaja ? (raw.motivoBaja?.trim() || null) : null,
      idArea: !esBaja && raw.idArea ? Number(raw.idArea) : null,
      idEncargadoAlmacen: Number(raw.idEncargadoAlmacen),
      ambiente: !esBaja && raw.ambiente ? raw.ambiente.trim() : null,
      prefijo: null,
      detalles: detallesRequest,
    };

    this.egresoService.registrar(request).subscribe({
      next: (egresoCreado) => {
        this.guardando.set(false);
        this.guardado.emit(egresoCreado);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.handleError(err);
      },
    });
  }

  private resetearFormulario(): void {
    this.guardando.set(false);
    this.errorGeneral.set(null);
    this.alertaDuplicado.set(null);
    this.busquedaSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.busquedaSubscriptions.clear();
    this.busquedaSubjects.forEach((subject) => subject.complete());
    this.busquedaSubjects.clear();
    this.setTipoOperacion('DESPACHO_ORDINARIO');

    // Encargado de almacén: solo tiene preferencia si es titular o si es el único activo; de lo contrario null para que el usuario elija
    const listaAlmacen = this.encargadosAlmacenActivos();
    const titular =
      listaAlmacen.find((e) => e.esTitular) || (listaAlmacen.length === 1 ? listaAlmacen[0] : null);
    const titularId = titular ? titular.id : null;

    // Encargado: si hay uno solo activo, se precarga automáticamente
    const listaEncargados = this.encargados().filter((e) => e.estado !== '0');
    const encargadoId = listaEncargados.length === 1 ? listaEncargados[0].id : null;

    // Área: si hay una sola activa, se precarga automáticamente
    const listaAreas = this.areas().filter((a) => a.estado !== '0');
    const areaId = listaAreas.length === 1 ? listaAreas[0].id : null;

    this.cabeceraForm.reset({
      tipoEgreso: 'DESPACHO_ORDINARIO',
      idCliente: null,
      idArea: areaId,
      ambiente: '',
      idEncargado: encargadoId,
      idEncargadoAlmacen: titularId,
      motivoBaja: '',
    });
    this.cabeceraForm.controls.idCliente.setValidators([Validators.required]);
    this.cabeceraForm.controls.idArea.setValidators([Validators.required]);
    this.cabeceraForm.controls.idEncargado.setValidators([Validators.required]);
    this.cabeceraForm.controls.ambiente.setValidators([Validators.maxLength(100)]);
    this.cabeceraForm.controls.motivoBaja.clearValidators();
    this.cabeceraForm.updateValueAndValidity();

    this.filas.set([]);
    this.agregarFila();
  }

  private conectarBusquedaFila(fila: FilaEgresoDetalle): void {
    const subject = new Subject<string>();
    this.busquedaSubjects.set(fila.id, subject);

    const subscription = subject
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(250),
        switchMap((termino) => {
          fila.buscando = true;
          fila.errorBusqueda = null;
          this.filas.set([...this.filas()]);
          return this.egresoService.buscarArticulosPredictivo(termino, true).pipe(
            catchError(() => {
              fila.errorBusqueda = 'No se pudieron consultar los artículos. Vuelva a buscar.';
              return of([]);
            }),
          );
        }),
      )
      .subscribe((articulos) => {
        fila.buscando = false;
        const articulosEnUso = new Set(
          this.filas()
            .filter((f) => f.id !== fila.id && f.idArticulo !== null)
            .map((f) => f.idArticulo!),
        );

        fila.sugerencias = articulos.filter((a) => !articulosEnUso.has(a.id));

        this.filas.set([...this.filas()]);
      });
    this.busquedaSubscriptions.set(fila.id, subscription);
  }

  private handleError(err: unknown): void {
    const errorBody =
      typeof err === 'object' && err !== null && 'error' in err
        ? (err as { error?: unknown }).error
        : err;

    this.errorGeneral.set(
      this.extraerMensaje(errorBody, 'Ocurrió un error al procesar el registro del despacho.'),
    );
  }

  private extraerMensaje(errorBody: unknown, fallback: string): string {
    if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
      return errorBody;
    }
    if (typeof errorBody === 'object' && errorBody !== null) {
      const cand = errorBody as { message?: string; mensaje?: string; error?: string };
      return cand.mensaje || cand.message || cand.error || fallback;
    }
    return fallback;
  }
}
