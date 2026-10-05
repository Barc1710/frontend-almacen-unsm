import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
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
import { catchError, debounceTime, distinctUntilChanged, of, Subject, Subscription, switchMap } from 'rxjs';
import { obtenerFechaHoy } from '../../../../core';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { Articulo } from '../../../articulos/models';
import {
  Encargado,
  EncargadoAlmacen,
  IngresoConDetalles,
  IngresoCreateRequest,
  Proveedor,
} from '../../models';
import { IngresoService } from '../../services';

function normalizarTexto(txt: string | null | undefined): string {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function filtrarArticulosPorTexto(disponibles: Articulo[], queryNorm: string): Articulo[] {
  if (!queryNorm) {
    return disponibles
      .slice()
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }))
      .slice(0, 50);
  }

  const empiezanDesc = disponibles
    .filter((a) => normalizarTexto(a.descripcion).startsWith(queryNorm))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }));

  if (empiezanDesc.length > 0) {
    return empiezanDesc.slice(0, 50);
  }

  const empiezanPalabra = disponibles
    .filter((a) =>
      normalizarTexto(a.descripcion)
        .split(/[\s\-_/]+/)
        .some((palabra) => palabra.startsWith(queryNorm)),
    )
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }));

  const empiezanCodigo = disponibles
    .filter(
      (a) =>
        !normalizarTexto(a.descripcion)
          .split(/[\s\-_/]+/)
          .some((palabra) => palabra.startsWith(queryNorm)) &&
        normalizarTexto(a.codigo).startsWith(queryNorm),
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { sensitivity: 'base' }));

  return [...empiezanPalabra, ...empiezanCodigo].slice(0, 50);
}

export interface FilaDetalle {
  readonly id: string;
  articulo: Articulo | null;
  idArticulo: number | null;
  codigoArticulo: string;
  descripcionArticulo: string;
  simboloUnidadMedida: string;
  permiteDecimales: boolean;
  cantidad: number;
  precioUnitario: number;
  busquedaTexto: string;
  buscando: boolean;
  sugerencias: Articulo[];
  mostrarSugerencias: boolean;
  errorArticulo?: string | null;
  errorCantidad?: string | null;
}

interface CabeceraForm {
  idProveedor: FormControl<number | null>;
  numeroOrdenCompra: FormControl<string>;
  fecha: FormControl<string>;
  observacion: FormControl<string>;
  idEncargadoAlmacen: FormControl<number | null>;
  idJefe: FormControl<number | null>;
}

@Component({
  selector: 'app-ingreso-form-modal',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DecimalPipe,
    ModalDialogDirective,
    LucideX,
    LucideSave,
    LucideLoader2,
    LucidePlus,
    LucideTrash,
    LucideSearch,
    LucideCircleAlert,
    LucideAlertCircle,
    LucideChevronDown,
  ],
  templateUrl: './ingreso-form-modal.component.html',
  styles: `
    input[type='date'] {
      cursor: pointer;
    }
    input[type='date']::-webkit-calendar-picker-indicator {
      cursor: pointer;
      margin-top: auto;
      margin-bottom: auto;
      vertical-align: middle;
      font-size: 16px;
      opacity: 0.8;
    }
    input[type='date']:disabled {
      cursor: not-allowed;
    }
    input[type='date']:disabled::-webkit-calendar-picker-indicator {
      cursor: not-allowed;
      opacity: 0.4;
      pointer-events: none;
    }
  `,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class IngresoFormModalComponent implements OnInit {
  private readonly ingresoService = inject(IngresoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  readonly proveedores = input<Proveedor[]>([]);

  readonly cerrar = output<void>();
  readonly guardado = output<IngresoConDetalles>();

  readonly guardando = signal<boolean>(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly alertaDuplicado = signal<string | null>(null);
  readonly siguienteNumero = signal<string>('');

  readonly catalogoArticulos = signal<Articulo[]>([]);
  readonly encargadosAlmacen = signal<EncargadoAlmacen[]>([]);
  readonly jefes = signal<Encargado[]>([]);
  readonly cargandoFirmantes = signal<boolean>(false);
  readonly filas = signal<FilaDetalle[]>([]);

  private readonly busquedaSubjects = new Map<string, Subject<string>>();
  private readonly busquedaSubscriptions = new Map<string, Subscription>();

  readonly cabeceraForm = new FormGroup<CabeceraForm>({
    idProveedor: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    numeroOrdenCompra: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    fecha: new FormControl<string>(obtenerFechaHoy(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    observacion: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    idEncargadoAlmacen: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    idJefe: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
  });

  /**
   * Cantidad de renglones con artículo seleccionado.
   */
  readonly totalArticulos = computed(() => {
    return this.filas().filter((f) => f.articulo !== null).length;
  });

  /**
   * Suma de cantidades físicas de artículos recepcionados.
   */
  readonly totalCantidad = computed(() => {
    return this.filas()
      .filter((f) => f.articulo !== null)
      .reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0);
  });

  constructor() {
    // Inicialización o reset al abrir la modal
    effect(() => {
      if (this.visible()) {
        untracked(() => {
          this.resetearFormulario();
          this.cargarFirmantes();
          this.cargarSiguienteNumero();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarCatalogoArticulos();
  }

  cargarSiguienteNumero(): void {
    this.ingresoService
      .obtenerSiguienteNumero()
      .pipe(
        catchError(() => of('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((num) => this.siguienteNumero.set(num));
  }

  cargarFirmantes(): void {
    this.cargandoFirmantes.set(true);
    this.ingresoService
      .listarEncargadosAlmacenActivos()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => {
        this.encargadosAlmacen.set(lista);
        if (!this.cabeceraForm.controls.idEncargadoAlmacen.value) {
          const titular = lista.find((e) => e.esTitular) || (lista.length === 1 ? lista[0] : null);
          if (titular) {
            this.cabeceraForm.controls.idEncargadoAlmacen.setValue(titular.id);
          }
        }
      });

    this.ingresoService
      .listarJefesActivos()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (lista) => {
          this.jefes.set(lista);
          if (!this.cabeceraForm.controls.idJefe.value && lista.length === 1) {
            this.cabeceraForm.controls.idJefe.setValue(lista[0].id);
          }
          this.cargandoFirmantes.set(false);
        },
        error: () => this.cargandoFirmantes.set(false),
      });
  }

  cargarCatalogoArticulos(): void {
    this.ingresoService
      .listarArticulosActivos()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((articulos) => {
        const ordenados = [...articulos].sort((a, b) =>
          a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }),
        );
        this.catalogoArticulos.set(ordenados);
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

  agregarFila(): void {
    const nuevaFila: FilaDetalle = {
      id: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      articulo: null,
      idArticulo: null,
      codigoArticulo: '',
      descripcionArticulo: '',
      simboloUnidadMedida: 'UND',
      permiteDecimales: false,
      cantidad: 1,
      precioUnitario: 0,
      busquedaTexto: '',
      buscando: false,
      sugerencias: [],
      mostrarSugerencias: false,
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

  onFocusArticulo(fila: FilaDetalle): void {
    fila.mostrarSugerencias = true;
    this.filtrarSugerencias(fila);
  }

  onBuscarArticuloInput(fila: FilaDetalle, texto: string): void {
    fila.busquedaTexto = texto;
    fila.errorArticulo = null;
    this.alertaDuplicado.set(null);
    fila.mostrarSugerencias = true;
    this.filtrarSugerencias(fila);

    // Consulta remota complementaria si no se tienen resultados locales
    let subject = this.busquedaSubjects.get(fila.id);
    if (!subject) {
      this.conectarBusquedaFila(fila);
      subject = this.busquedaSubjects.get(fila.id);
    }
    subject?.next(texto);
  }

  filtrarSugerencias(fila: FilaDetalle): void {
    const rawQuery = (fila.busquedaTexto || '').trim();
    const queryNorm = normalizarTexto(rawQuery);
    const catalogo = this.catalogoArticulos();

    // Descartar artículos ya seleccionados en otras filas
    const articulosEnUso = new Set(
      this.filas()
        .filter((f) => f.id !== fila.id && f.idArticulo !== null)
        .map((f) => f.idArticulo!),
    );

    const disponibles = catalogo.filter((a) => !articulosEnUso.has(a.id));
    fila.sugerencias = filtrarArticulosPorTexto(disponibles, queryNorm);
    this.filas.set([...this.filas()]);
  }

  seleccionarArticulo(fila: FilaDetalle, articulo: Articulo): void {
    // Validación de Integridad en Lote: Evitar artículos repetidos
    const yaExisteEnOtraFila = this.filas().some(
      (f) => f.id !== fila.id && f.idArticulo === articulo.id,
    );

    if (yaExisteEnOtraFila) {
      fila.errorArticulo = `El artículo [${articulo.codigo}] ya está presente en el detalle.`;
      this.alertaDuplicado.set(
        `El artículo "${articulo.codigo} - ${articulo.descripcion}" ya fue agregado en otra fila del comprobante.`,
      );
      fila.mostrarSugerencias = false;
      return;
    }

    fila.articulo = articulo;
    fila.idArticulo = articulo.id;
    fila.codigoArticulo = articulo.codigo;
    fila.descripcionArticulo = articulo.descripcion;
    fila.simboloUnidadMedida = articulo.simboloUnidadMedida || '';
    fila.permiteDecimales = articulo.permiteDecimales === true;

    fila.cantidad = 1;
    fila.precioUnitario = 0; // Precios siempre en 0
    fila.busquedaTexto = '';
    fila.mostrarSugerencias = false;
    fila.sugerencias = [];
    fila.errorArticulo = null;
    fila.errorCantidad = null;
    this.alertaDuplicado.set(null);

    this.filas.set([...this.filas()]);
  }

  limpiarArticuloEnFila(fila: FilaDetalle): void {
    fila.articulo = null;
    fila.idArticulo = null;
    fila.codigoArticulo = '';
    fila.descripcionArticulo = '';
    fila.simboloUnidadMedida = 'UND';
    fila.permiteDecimales = false;
    fila.cantidad = 1;
    fila.precioUnitario = 0;
    fila.busquedaTexto = '';
    fila.mostrarSugerencias = false;
    fila.sugerencias = [];
    fila.errorArticulo = null;
    fila.errorCantidad = null;
    this.alertaDuplicado.set(null);

    this.filas.set([...this.filas()]);
  }

  onCantidadInput(fila: FilaDetalle, nuevoValor: unknown): void {
    fila.errorCantidad = null;
    if (nuevoValor === null || nuevoValor === undefined || nuevoValor === '') {
      return;
    }
    const cant = Number(nuevoValor);
    if (!isNaN(cant) && cant >= 0) {
      fila.cantidad = cant;
    }
  }

  onCantidadBlur(fila: FilaDetalle): void {
    let cant = Number(fila.cantidad);
    if (isNaN(cant) || cant <= 0) {
      cant = 1;
    } else if (!fila.permiteDecimales) {
      cant = Math.round(cant);
    } else {
      cant = Math.round(cant * 100) / 100;
    }
    fila.cantidad = cant;
    fila.errorCantidad = null;
    this.filas.set([...this.filas()]);
  }

  cerrarSugerencias(fila: FilaDetalle, event: FocusEvent): void {
    const contenedor = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && contenedor.contains(event.relatedTarget)) return;
    fila.mostrarSugerencias = false;
    this.filas.set([...this.filas()]);
  }

  onSubmit(): void {
    if (this.guardando()) return;

    this.errorGeneral.set(null);
    this.alertaDuplicado.set(null);

    let hayErrores = false;

    // 1. Validar cabecera (Proveedor y Fecha) - Solo marcar campo faltante como en Nuevo Artículo
    if (this.cabeceraForm.invalid) {
      this.cabeceraForm.markAllAsTouched();
      hayErrores = true;
    }

    // 2. Validar artículos seleccionados y cantidades en cada fila
    const listaFilas = this.filas();
    if (listaFilas.length === 0) {
      this.agregarFila();
      return;
    }

    for (const f of listaFilas) {
      if (!f.articulo || !f.idArticulo) {
        f.errorArticulo = 'Debe seleccionar un artículo';
        hayErrores = true;
      } else {
        f.errorArticulo = null;
      }

      const cant = Number(f.cantidad);
      if (isNaN(cant) || cant <= 0) {
        f.errorCantidad = 'Cantidad debe ser mayor a 0';
        hayErrores = true;
      } else if (!f.permiteDecimales && !Number.isInteger(cant)) {
        f.errorCantidad = 'Solo admite enteros';
        hayErrores = true;
      } else if (f.permiteDecimales) {
        const partes = String(cant).split('.');
        if (partes.length > 1 && partes[1].length > 2) {
          f.errorCantidad = 'Máximo 2 decimales';
          hayErrores = true;
        } else {
          f.errorCantidad = null;
        }
      } else {
        f.errorCantidad = null;
      }
    }

    this.filas.set([...listaFilas]);

    if (hayErrores) {
      // Como en "Nuevo Artículo", no mostramos banner emergente,
      // únicamente se iluminan en rojo los campos con error o incompletos.
      return;
    }

    const filasConArticulo = listaFilas.filter((f) => f.articulo !== null && f.idArticulo !== null);
    if (filasConArticulo.length === 0) {
      return;
    }

    this.guardando.set(true);

    const raw = this.cabeceraForm.getRawValue();

    const request: IngresoCreateRequest = {
      idProveedor: Number(raw.idProveedor),
      numeroOrden: raw.numeroOrdenCompra.trim() || '',
      numeroOrdenCompra: raw.numeroOrdenCompra.trim() || null,
      fecha: raw.fecha,
      observacion: raw.observacion.trim() || null,
      idEncargadoAlmacen: raw.idEncargadoAlmacen ? Number(raw.idEncargadoAlmacen) : null,
      idJefe: raw.idJefe ? Number(raw.idJefe) : null,
      detalles: filasConArticulo.map((f) => ({
        idArticulo: f.idArticulo!,
        cantidad: Number(f.cantidad),
        precioUnitario: 0, // Precio siempre en 0
      })),
    };

    this.ingresoService.crear(request).subscribe({
      next: (ingresoCreado) => {
        this.guardando.set(false);
        this.guardado.emit(ingresoCreado);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.handleError(err);
      },
    });
  }

  isFieldInvalid(field: keyof CabeceraForm): boolean {
    const control = this.cabeceraForm.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  abrirSelectorFecha(event: MouseEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.disabled) return;
    try {
      input.showPicker();
    } catch {
      // Ignorar si el navegador no soporta showPicker o ya está abierto
    }
  }

  private resetearFormulario(): void {
    this.guardando.set(false);
    this.errorGeneral.set(null);
    this.alertaDuplicado.set(null);
    this.busquedaSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.busquedaSubscriptions.clear();
    this.busquedaSubjects.forEach((subject) => subject.complete());
    this.busquedaSubjects.clear();

    this.cabeceraForm.reset({
      idProveedor: null,
      numeroOrdenCompra: '',
      fecha: obtenerFechaHoy(),
      observacion: '',
      idEncargadoAlmacen: null,
      idJefe: null,
    });

    this.filas.set([]);
    this.agregarFila();
  }

  private conectarBusquedaFila(fila: FilaDetalle): void {
    const subject = new Subject<string>();
    this.busquedaSubjects.set(fila.id, subject);

    const subscription = subject
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((termino) => {
          const limpio = termino.trim();
          if (limpio.length >= 2 && fila.sugerencias.length === 0) {
            fila.buscando = true;
            return this.ingresoService
              .buscarArticulosParaIngreso(limpio)
              .pipe(catchError(() => of([])));
          }
          return of([]);
        }),
      )
      .subscribe((articulos) => {
        fila.buscando = false;
        if (articulos.length > 0) {
          const articulosEnUso = new Set(
            this.filas()
              .filter((f) => f.id !== fila.id && f.idArticulo !== null)
              .map((f) => f.idArticulo!),
          );
          const disponibles = articulos.filter((a) => !articulosEnUso.has(a.id));
          const queryNorm = normalizarTexto(fila.busquedaTexto);
          fila.sugerencias = filtrarArticulosPorTexto(disponibles, queryNorm);
          fila.mostrarSugerencias = fila.sugerencias.length > 0;
          this.filas.set([...this.filas()]);
        }
      });
    this.busquedaSubscriptions.set(fila.id, subscription);
  }

  private handleError(err: unknown): void {
    const errorBody =
      typeof err === 'object' && err !== null && 'error' in err
        ? (err as { error?: unknown }).error
        : err;

    this.errorGeneral.set(
      this.extraerMensaje(errorBody, 'Ocurrió un error al procesar el registro del ingreso.'),
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
