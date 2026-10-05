import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core';
import { EgresoService } from '../../services';
import { EgresoFormModalComponent } from './egreso-form-modal.component';

describe('Registro de egresos', () => {
  const admin = signal(true);
  const registrar = vi.fn();
  const articulo = {
    id: 10,
    codigo: 'A10',
    descripcion: 'Harina',
    simboloUnidadMedida: 'KG',
    permiteDecimales: true,
    saldo: 5,
    precio: 4,
    activo: true,
  };

  beforeEach(() => {
    admin.set(true);
    registrar.mockReset();
    // jsdom does not implement the native dialog methods.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = true;
        },
      },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false;
        },
      },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAdmin: admin } },
        {
          provide: EgresoService,
          useValue: { registrar, buscarArticulosPredictivo: () => of([articulo]) },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  function abrir() {
    const fixture = TestBed.createComponent(EgresoFormModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return fixture;
  }

  it('restaura las validaciones de despacho al reabrir después de una baja', () => {
    const fixture = abrir();
    fixture.componentInstance.setTipoOperacion('BAJA_DETERIORO');
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const form = fixture.componentInstance.cabeceraForm;
    expect(form.controls.ambiente.valid).toBe(true);
    expect(form.controls.idArea.hasError('required')).toBe(true);
    expect(fixture.componentInstance.tipoOperacion()).toBe('DESPACHO_ORDINARIO');
  });

  it('no inventa destinatarios cuando una baja carece de cliente o área', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.setTipoOperacion('BAJA_DETERIORO');
    component.cabeceraForm.patchValue({
      ambiente: 'Deteriorado',
      idEncargado: 2,
      idEncargadoAlmacen: 3,
    });
    component.seleccionarArticulo(component.filas()[0], articulo);
    component.onSubmit();
    expect(registrar).not.toHaveBeenCalled();
    expect(component.cabeceraForm.controls.motivoBaja.hasError('required')).toBe(true);
  });

  it('conserva los datos y artículos cuando terminan de llegar los catálogos', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.cabeceraForm.controls.ambiente.setValue('Laboratorio');
    component.seleccionarArticulo(component.filas()[0], articulo);
    fixture.componentRef.setInput('areas', [{ id: 2, nombre: 'Facultad' }]);
    fixture.componentRef.setInput('encargados', [{ id: 3, nombres: 'Ana', apellidos: 'Pérez' }]);
    fixture.detectChanges();
    expect(component.cabeceraForm.controls.ambiente.value).toBe('Laboratorio');
    expect(component.filas()[0].idArticulo).toBe(10);
  });

  it('impide que un operador seleccione bajas', () => {
    admin.set(false);
    const fixture = abrir();
    fixture.componentInstance.setTipoOperacion('BAJA_DETERIORO');
    expect(fixture.componentInstance.tipoOperacion()).toBe('DESPACHO_ORDINARIO');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Bajas por Deterioro');
  });

  it('selecciona una sugerencia mediante click, también generado por activación de teclado', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];
    fila.sugerencias = [articulo];
    fila.mostrarSugerencias = true;
    component.filas.set([...component.filas()]);
    fixture.detectChanges();
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Harina'),
    )!;
    button.click();
    expect(fila.idArticulo).toBe(10);
  });
});
