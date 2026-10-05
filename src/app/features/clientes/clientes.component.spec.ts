import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ClientesComponent } from './clientes.component';

describe('ClientesComponent', () => {
  let fixture: ComponentFixture<ClientesComponent>;
  let root: HTMLElement;

  function limpiarSesion(): void {
    window.sessionStorage.removeItem('almacen_token');
    window.sessionStorage.removeItem('almacen_user');
    window.sessionStorage.removeItem('almacen_modules');
    window.sessionStorage.removeItem('almacen_debe_cambiar_clave');
  }

  function esperarRender(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        fixture.detectChanges();
        resolve();
      }, 0);
    });
  }

  async function crearComponente(demo: boolean): Promise<void> {
    limpiarSesion();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard', children: [] }]),
      ],
    }).compileComponents();

    if (demo) {
      TestBed.inject(AuthService).iniciarSesionDemo();
    }

    fixture = TestBed.createComponent(ClientesComponent);
    root = fixture.debugElement.nativeElement as HTMLElement;
    fixture.detectChanges();

    if (!demo) {
      TestBed.inject(HttpTestingController)
        .expectOne((request) => request.url === `${environment.apiUrl}/clientes`)
        .flush({
          data: {
            content: [{ dni: '12345678', nombre: 'Ana Cliente' }],
            number: 0,
            size: 10,
            totalElements: 1,
            totalPages: 1,
          },
        });
    }

    await esperarRender();
  }

  function boton(texto: string): HTMLButtonElement {
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.includes(texto),
    );

    if (!button) {
      throw new Error(`No se encontró el botón "${texto}".`);
    }

    return button;
  }

  function filas(): HTMLTableRowElement[] {
    return Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  }

  function rellenar(selector: string, valor: string): void {
    const field = root.querySelector<HTMLInputElement>(selector);
    if (!field) {
      throw new Error(`No se encontró el campo "${selector}".`);
    }

    field.value = valor;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  afterEach(() => {
    limpiarSesion();
  });

  it('muestra la primera página con una ventana corta de paginación', async () => {
    await crearComponente(true);

    expect(filas()).toHaveLength(10);
    expect(root.textContent).toContain('de 89 clientes');

    const nav = root.querySelector('nav[aria-label="Paginación de clientes"]');
    const pageButtons = Array.from(
      nav?.querySelectorAll<HTMLButtonElement>('button[aria-label^="Ir a la página"]') ?? [],
    );

    expect(pageButtons.map((button) => button.textContent?.trim())).toEqual(['1', '2', '3', '9']);
    expect(nav?.textContent).toContain('…');
  });

  it('filtra la página actual por DNI, nombre o correo', async () => {
    await crearComponente(true);

    rellenar('input[type="search"]', 'Cliente 05');

    expect(filas()).toHaveLength(1);
    expect(filas()[0].textContent).toContain('Cliente 05');
    expect(root.textContent).toContain('1 coincidencia en esta página');
  });

  it('abre el formulario con foco inicial y lo cierra con Escape devolviendo el foco', async () => {
    await crearComponente(true);

    const abrir = boton('Nuevo cliente');
    abrir.click();
    fixture.detectChanges();
    await esperarRender();

    expect(root.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.activeElement).toBe(root.querySelector('#new-client-dni'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it('muestra los mensajes de validación cuando se envía el formulario vacío', async () => {
    await crearComponente(true);

    boton('Nuevo cliente').click();
    fixture.detectChanges();
    await esperarRender();

    boton('Guardar cliente').click();
    fixture.detectChanges();

    expect(root.querySelector('[role="dialog"]')).toBeTruthy();
    expect(root.querySelectorAll('[role="dialog"] [role="alert"]').length).toBeGreaterThan(0);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('registra un cliente con DNI válido y actualiza el listado', async () => {
    await crearComponente(true);

    boton('Nuevo cliente').click();
    fixture.detectChanges();
    await esperarRender();

    rellenar('#new-client-dni', '87654321');
    rellenar('#new-client-name', 'María Torres');
    rellenar('#new-client-email', 'maria@ejemplo.com');

    boton('Guardar cliente').click();
    fixture.detectChanges();

    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).toContain('El cliente se registró correctamente.');
    expect(filas()[0].textContent).toContain('María Torres');
    expect(root.textContent).toContain('de 90 clientes');
  });

  it('elimina un cliente desde el diálogo de confirmación', async () => {
    await crearComponente(true);

    const eliminar = root.querySelector<HTMLButtonElement>('button[aria-label^="Eliminar a"]');
    eliminar?.click();
    fixture.detectChanges();
    await esperarRender();

    expect(root.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(document.activeElement).toBe(root.querySelector('#delete-cancel-button'));

    boton('Sí, eliminar').click();
    fixture.detectChanges();

    expect(root.querySelector('[role="alertdialog"]')).toBeNull();
    expect(root.textContent).toContain('El cliente se eliminó correctamente.');
    expect(root.textContent).toContain('de 88 clientes');
    expect(document.activeElement).toBe(root.querySelector('div[role="region"][tabindex="0"]'));
  });

  it('bloquea la edición y la eliminación cuando no hay sesión demo', async () => {
    await crearComponente(false);

    const editar = root.querySelector<HTMLButtonElement>('button[aria-label^="Editar a"]');
    const eliminar = root.querySelector<HTMLButtonElement>('button[aria-label^="Eliminar a"]');

    expect(editar?.disabled).toBe(true);
    expect(eliminar?.disabled).toBe(true);
    expect(root.textContent).toContain('cuando el backend tenga esas operaciones');
    expect(filas()).toHaveLength(1);
  });
});
