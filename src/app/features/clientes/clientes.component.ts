import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { PageResponse } from '../../core/models/api-response.model';
import { Cliente, esDniValido, getPageIndicators, NuevoCliente } from './cliente.model';
import { ClientesService } from './clientes.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const LOAD_ERROR_MESSAGE = 'No fue posible cargar los clientes. Inténtalo de nuevo.';
const SAVE_ERROR_MESSAGE = 'No fue posible guardar los cambios. Inténtalo de nuevo.';
const DELETE_ERROR_MESSAGE = 'No fue posible eliminar el cliente. Inténtalo de nuevo.';

@Component({
  selector: 'app-clientes',
  imports: [
    ReactiveFormsModule,
    LucideChevronLeft,
    LucideChevronRight,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
  ],
  templateUrl: './clientes.component.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ClientesComponent implements OnInit {
  private readonly clientesService = inject(ClientesService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly puedeModificar = this.clientesService.puedeModificar;
  protected readonly pageSize = 10;
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly deleteErrorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isCreateDialogOpen = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly selectedCliente = signal<Cliente | null>(null);
  protected readonly clienteToDelete = signal<Cliente | null>(null);
  protected readonly pageIndicators = computed(() =>
    getPageIndicators(this.totalPages(), this.page()),
  );
  protected readonly clienteForm = this.formBuilder.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    direccion: ['', Validators.maxLength(200)],
    telefono: ['', Validators.maxLength(20)],
    correo: ['', [Validators.email, Validators.maxLength(160)]],
  });

  protected readonly clientesFiltrados = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    if (!term) {
      return this.clientes();
    }

    return this.clientes().filter((cliente) => {
      const nombre = this.nombreCompleto(cliente).toLocaleLowerCase();
      const correo = (cliente.correo ?? '').toLocaleLowerCase();
      return (
        this.dniDe(cliente).toLocaleLowerCase().includes(term) ||
        nombre.includes(term) ||
        correo.includes(term)
      );
    });
  });

  protected readonly hayFiltro = computed(() => this.search().trim().length > 0);
  protected readonly resumenFiltro = computed(() => {
    const matches = this.clientesFiltrados().length;
    return `${matches} ${matches === 1 ? 'coincidencia' : 'coincidencias'} en esta página`;
  });
  protected readonly firstItem = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.pageSize + 1,
  );
  protected readonly lastItem = computed(() =>
    Math.min((this.page() + 1) * this.pageSize, this.totalElements()),
  );

  private previouslyFocused: HTMLElement | null = null;
  private readonly dniField = viewChild<ElementRef<HTMLInputElement>>('dniField');
  private readonly tableRegion = viewChild<ElementRef<HTMLElement>>('tableRegion');
  private readonly cancelDeleteButton =
    viewChild<ElementRef<HTMLButtonElement>>('cancelDeleteButton');

  ngOnInit(): void {
    this.loadPage(0);
  }

  protected loadPreviousPage(): void {
    if (!this.loading() && this.page() > 0) {
      this.successMessage.set(null);
      this.loadPage(this.page() - 1);
    }
  }

  protected loadNextPage(): void {
    if (!this.loading() && this.page() + 1 < this.totalPages()) {
      this.successMessage.set(null);
      this.loadPage(this.page() + 1);
    }
  }

  protected goToPage(page: number): void {
    if (!this.loading() && page >= 0 && page < this.totalPages() && page !== this.page()) {
      this.successMessage.set(null);
      this.loadPage(page);
    }
  }

  protected retry(): void {
    this.loadPage(this.page());
  }

  protected openCreateDialog(event?: Event): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.createErrorMessage.set(null);
    this.selectedCliente.set(null);
    this.clienteForm.reset();
    this.rememberFocus(event?.currentTarget);
    this.isCreateDialogOpen.set(true);
    this.focusAfterRender(() => this.dniField()?.nativeElement);
  }

  protected openEditDialog(cliente: Cliente, event?: Event): void {
    if (!this.puedeModificar()) {
      return;
    }

    this.rememberFocus(event?.currentTarget);
    this.selectedCliente.set(cliente);
    this.createErrorMessage.set(null);
    this.clienteForm.reset({
      dni: String(cliente.dni ?? ''),
      nombre:
        this.nombreCompleto(cliente) === 'Sin nombre registrado'
          ? ''
          : this.nombreCompleto(cliente),
      direccion: cliente.direccion ?? '',
      telefono: cliente.telefono ?? '',
      correo: cliente.correo ?? '',
    });
    this.isCreateDialogOpen.set(true);
    this.focusAfterRender(() => this.dniField()?.nativeElement);
  }

  protected dniDe(cliente: Cliente): string {
    return String(cliente.dni ?? '—');
  }

  protected trackCliente(cliente: Cliente): string {
    return String(cliente.id ?? cliente.dni);
  }

  protected closeCreateDialog(): void {
    if (!this.isSaving()) {
      this.isCreateDialogOpen.set(false);
      this.restoreFocus();
    }
  }

  protected onEscape(): void {
    if (this.isCreateDialogOpen()) {
      this.closeCreateDialog();
      return;
    }

    if (this.clienteToDelete()) {
      this.cancelDelete();
    }
  }

  protected trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const container = event.currentTarget as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (keyboardEvent.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!keyboardEvent.shiftKey && (active === last || !container.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  protected submitCliente(): void {
    const values = this.clienteForm.getRawValue();
    if (this.clienteForm.invalid || !esDniValido(values.dni) || this.isSaving()) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.createErrorMessage.set(null);
    const cliente: NuevoCliente = values;
    const selectedCliente = this.selectedCliente();
    const save$ = selectedCliente
      ? this.clientesService.actualizar(selectedCliente, cliente)
      : this.clientesService.registrar(cliente);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCreateDialogOpen.set(false);
        this.selectedCliente.set(null);
        this.search.set('');
        this.successMessage.set(
          selectedCliente
            ? 'Los datos del cliente se actualizaron correctamente.'
            : 'El cliente se registró correctamente.',
        );
        this.restoreFocus();
        this.loadPage(0);
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.createErrorMessage.set(this.getErrorMessage(error, SAVE_ERROR_MESSAGE));
      },
    });
  }

  protected requestDelete(cliente: Cliente, event?: Event): void {
    if (!this.puedeModificar()) {
      return;
    }

    this.rememberFocus(event?.currentTarget);
    this.deleteErrorMessage.set(null);
    this.clienteToDelete.set(cliente);
    this.focusAfterRender(() => this.cancelDeleteButton()?.nativeElement);
  }

  protected cancelDelete(): void {
    if (!this.isSaving()) {
      this.clienteToDelete.set(null);
      this.deleteErrorMessage.set(null);
      this.restoreFocus();
    }
  }

  protected confirmDelete(): void {
    const cliente = this.clienteToDelete();
    if (!cliente || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.deleteErrorMessage.set(null);
    this.clientesService.eliminar(cliente).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.clienteToDelete.set(null);
        this.successMessage.set('El cliente se eliminó correctamente.');
        this.previouslyFocused = null;
        const targetPage = Math.min(
          this.page(),
          Math.max(0, Math.ceil((this.totalElements() - 1) / this.pageSize) - 1),
        );
        this.loadPage(targetPage);
        this.tableRegion()?.nativeElement.focus();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.deleteErrorMessage.set(this.getErrorMessage(error, DELETE_ERROR_MESSAGE));
      },
    });
  }

  protected onSearchChange(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected nombreCompleto(cliente: Cliente): string {
    const nombre = cliente.nombre?.trim();
    if (nombre) {
      return nombre;
    }

    const nombreCompuesto = [cliente.nombres, cliente.apellidos]
      .filter((parte): parte is string => Boolean(parte?.trim()))
      .join(' ')
      .trim();

    return nombreCompuesto || 'Sin nombre registrado';
  }

  private rememberFocus(trigger?: EventTarget | null): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      this.previouslyFocused = active;
      return;
    }

    this.previouslyFocused = trigger instanceof HTMLElement ? trigger : null;
  }

  private restoreFocus(): void {
    const target = this.previouslyFocused;
    this.previouslyFocused = null;

    if (target && document.contains(target)) {
      target.focus();
      return;
    }

    this.tableRegion()?.nativeElement.focus();
  }

  private focusAfterRender(getElement: () => HTMLElement | undefined): void {
    setTimeout(() => getElement()?.focus());
  }

  private loadPage(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.clientesService.obtenerPagina(page, this.pageSize).subscribe({
      next: (result) => this.setPage(result),
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error, LOAD_ERROR_MESSAGE));
      },
    });
  }

  private setPage(result: PageResponse<Cliente>): void {
    this.clientes.set(result.content);
    this.page.set(result.page ?? result.number ?? 0);
    this.totalPages.set(result.totalPages);
    this.totalElements.set(result.totalElements);
    this.loading.set(false);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
      }

      const response = error.error;
      if (typeof response === 'object' && response !== null) {
        const message = response['mensaje'] ?? response['message'];
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }

      return fallback;
    }

    return error instanceof Error && error.message.trim()
      ? error.message
      : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
