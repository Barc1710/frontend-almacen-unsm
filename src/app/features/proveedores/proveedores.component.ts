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
import { esRucValido, getPageIndicators, NuevoProveedor, Proveedor } from './proveedor.model';
import { ProveedoresService } from './proveedores.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const LOAD_ERROR_MESSAGE = 'No fue posible cargar los proveedores. Inténtalo de nuevo.';
const SAVE_ERROR_MESSAGE = 'No fue posible guardar los cambios. Inténtalo de nuevo.';
const DELETE_ERROR_MESSAGE = 'No fue posible eliminar el proveedor. Inténtalo de nuevo.';

@Component({
  selector: 'app-proveedores',
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
  templateUrl: './proveedores.component.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ProveedoresComponent implements OnInit {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly puedeModificar = this.proveedoresService.puedeModificar;
  protected readonly pageSize = 10;
  protected readonly proveedores = signal<Proveedor[]>([]);
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
  protected readonly selectedProveedor = signal<Proveedor | null>(null);
  protected readonly proveedorToDelete = signal<Proveedor | null>(null);
  protected readonly pageIndicators = computed(() =>
    getPageIndicators(this.totalPages(), this.page()),
  );
  protected readonly proveedorForm = this.formBuilder.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    razonSocial: ['', [Validators.required, Validators.maxLength(120)]],
    direccion: ['', Validators.maxLength(200)],
    telefono: ['', Validators.maxLength(20)],
    correo: ['', [Validators.email, Validators.maxLength(160)]],
  });

  protected readonly proveedoresFiltrados = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    if (!term) {
      return this.proveedores();
    }

    return this.proveedores().filter((proveedor) => {
      const razonSocial = this.razonSocialDe(proveedor).toLocaleLowerCase();
      const correo = (proveedor.correo ?? '').toLocaleLowerCase();
      return (
        this.rucDe(proveedor).toLocaleLowerCase().includes(term) ||
        razonSocial.includes(term) ||
        correo.includes(term)
      );
    });
  });

  protected readonly hayFiltro = computed(() => this.search().trim().length > 0);
  protected readonly resumenFiltro = computed(() => {
    const matches = this.proveedoresFiltrados().length;
    return `${matches} ${matches === 1 ? 'coincidencia' : 'coincidencias'} en esta página`;
  });
  protected readonly firstItem = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.pageSize + 1,
  );
  protected readonly lastItem = computed(() =>
    Math.min((this.page() + 1) * this.pageSize, this.totalElements()),
  );

  private previouslyFocused: HTMLElement | null = null;
  private readonly rucField = viewChild<ElementRef<HTMLInputElement>>('rucField');
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
    this.selectedProveedor.set(null);
    this.proveedorForm.reset();
    this.rememberFocus(event?.currentTarget);
    this.isCreateDialogOpen.set(true);
    this.focusAfterRender(() => this.rucField()?.nativeElement);
  }

  protected openEditDialog(proveedor: Proveedor, event?: Event): void {
    if (!this.puedeModificar()) {
      return;
    }

    this.rememberFocus(event?.currentTarget);
    this.selectedProveedor.set(proveedor);
    this.createErrorMessage.set(null);
    this.proveedorForm.reset({
      ruc: String(proveedor.ruc ?? ''),
      razonSocial: this.razonSocialDe(proveedor) === 'Sin razón social registrada'
        ? ''
        : this.razonSocialDe(proveedor),
      direccion: proveedor.direccion ?? '',
      telefono: proveedor.telefono ?? '',
      correo: proveedor.correo ?? '',
    });
    this.isCreateDialogOpen.set(true);
    this.focusAfterRender(() => this.rucField()?.nativeElement);
  }

  protected rucDe(proveedor: Proveedor): string {
    return String(proveedor.ruc ?? '—');
  }

  protected trackProveedor(proveedor: Proveedor): string {
    return String(proveedor.id ?? proveedor.ruc);
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

    if (this.proveedorToDelete()) {
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

  protected submitProveedor(): void {
    const values = this.proveedorForm.getRawValue();
    if (this.proveedorForm.invalid || !esRucValido(values.ruc) || this.isSaving()) {
      this.proveedorForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.createErrorMessage.set(null);
    const proveedor: NuevoProveedor = values;
    const selectedProveedor = this.selectedProveedor();
    const save$ = selectedProveedor
      ? this.proveedoresService.actualizar(selectedProveedor, proveedor)
      : this.proveedoresService.registrar(proveedor);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCreateDialogOpen.set(false);
        this.selectedProveedor.set(null);
        this.search.set('');
        this.successMessage.set(
          selectedProveedor
            ? 'Los datos del proveedor se actualizaron correctamente.'
            : 'El proveedor se registró correctamente.',
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

  protected requestDelete(proveedor: Proveedor, event?: Event): void {
    if (!this.puedeModificar()) {
      return;
    }

    this.rememberFocus(event?.currentTarget);
    this.deleteErrorMessage.set(null);
    this.proveedorToDelete.set(proveedor);
    this.focusAfterRender(() => this.cancelDeleteButton()?.nativeElement);
  }

  protected cancelDelete(): void {
    if (!this.isSaving()) {
      this.proveedorToDelete.set(null);
      this.deleteErrorMessage.set(null);
      this.restoreFocus();
    }
  }

  protected confirmDelete(): void {
    const proveedor = this.proveedorToDelete();
    if (!proveedor || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.deleteErrorMessage.set(null);
    this.proveedoresService.eliminar(proveedor).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.proveedorToDelete.set(null);
        this.successMessage.set('El proveedor se eliminó correctamente.');
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

  protected razonSocialDe(proveedor: Proveedor): string {
    return proveedor.razonSocial?.trim() || 'Sin razón social registrada';
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

    this.proveedoresService.obtenerPagina(page, this.pageSize).subscribe({
      next: (result) => this.setPage(result),
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error, LOAD_ERROR_MESSAGE));
      },
    });
  }

  private setPage(result: PageResponse<Proveedor>): void {
    this.proveedores.set(result.content);
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
