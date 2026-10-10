import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamiliaService } from '../../services';
import { FamiliaFormModalComponent } from './familia-form-modal.component';

describe('Formulario de familias', () => {
  const sugerirInicial = vi.fn();
  const crear = vi.fn();
  const actualizar = vi.fn();
  let requests: Subject<string>[];

  beforeEach(() => {
    vi.useFakeTimers();
    requests = [];
    sugerirInicial.mockReset().mockImplementation(() => {
      const request = new Subject<string>();
      requests.push(request);
      return request;
    });
    crear.mockReset().mockReturnValue(of({ success: true }));
    actualizar.mockReset().mockReturnValue(of({ success: true }));
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = true;
          this.querySelector<HTMLElement>('[autofocus]')?.focus();
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
      providers: [{ provide: FamiliaService, useValue: { sugerirInicial, crear, actualizar } }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  function abrir() {
    const fixture = TestBed.createComponent(FamiliaFormModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return fixture;
  }

  it('bloquea guardar desde que cambia el nombre y descarta la respuesta anterior', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.form.controls.nombre.setValue('Computadoras');
    expect(component.sugiriendoInicial()).toBe(true);
    component.onSubmit();
    expect(crear).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    component.form.controls.nombre.setValue('Cuadernos');
    expect(requests[0].observed).toBe(false);
    requests[0].next('CO');
    expect(component.form.controls.inicial.value).toBe('');
    vi.advanceTimersByTime(250);
    requests[1].next('CU');
    requests[1].complete();
    expect(component.form.controls.inicial.value).toBe('CU');
    component.onSubmit();
    expect(crear).toHaveBeenCalledWith({ nombre: 'Cuadernos', inicial: 'CU' });
  });

  it('cancela al cerrar y no rellena una apertura nueva con datos antiguos', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.form.controls.nombre.setValue('Computadoras');
    vi.advanceTimersByTime(250);
    component.onCerrar();
    expect(requests[0].observed).toBe(false);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    requests[0].next('CO');
    expect(component.form.getRawValue()).toEqual({ nombre: '', inicial: '' });
    expect(component.sugiriendoInicial()).toBe(false);
  });

  it('respeta la inicial manual y vuelve a consultar si se borra', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.form.controls.nombre.setValue('Computadoras');
    vi.advanceTimersByTime(250);
    const input = fixture.nativeElement.querySelector('#inicialFamilia') as HTMLInputElement;
    input.value = 'CX';
    input.dispatchEvent(new Event('input'));
    expect(requests[0].observed).toBe(false);
    requests[0].next('CO');
    expect(component.form.controls.inicial.value).toBe('CX');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(component.form.controls.inicial.value).toBe('');
    expect(component.sugiriendoInicial()).toBe(true);
    vi.advanceTimersByTime(250);
    expect(sugerirInicial).toHaveBeenCalledTimes(2);
    requests[1].next('CO');
    requests[1].complete();
    expect(component.form.controls.inicial.value).toBe('CO');
  });

  it('no sustituye un error de sugerencia por una inicial sin validar', () => {
    const fixture = abrir();
    const component = fixture.componentInstance;
    component.form.controls.nombre.setValue('Computadoras');
    vi.advanceTimersByTime(250);
    requests[0].error({ error: { message: 'Sin iniciales disponibles' } });
    expect(component.errorGeneral()).toBe('Sin iniciales disponibles');
    expect(component.sugiriendoInicial()).toBe(false);
    expect(component.form.controls.inicial.value).toBe('');
    component.onSubmit();
    expect(crear).not.toHaveBeenCalled();
  });

  it('destruir el modal cancela también la petición interna de sugerencia', () => {
    const fixture = abrir();
    fixture.componentInstance.form.controls.nombre.setValue('Computadoras');
    vi.advanceTimersByTime(250);
    fixture.destroy();
    expect(requests[0].observed).toBe(false);
  });

  it('permite editar el nombre conservando una inicial histórica larga', () => {
    const fixture = abrir();
    fixture.componentRef.setInput('familia', {
      id: 7,
      nombre: 'Laboratorio',
      inicial: 'LAB',
      estado: '1',
      correlativo: 42,
    });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls.nombre.setValue('Laboratorio central');
    component.onSubmit();
    expect(actualizar).toHaveBeenCalledWith(7, { nombre: 'Laboratorio central', inicial: 'LAB' });
    expect(sugerirInicial).not.toHaveBeenCalled();
  });

  it('usa diálogo modal y restaura el foco al cerrarse', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    try {
      const fixture = abrir();
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      expect(dialog.open).toBe(true);
      expect(document.activeElement?.id).toBe('nombreFamilia');
      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });
});
