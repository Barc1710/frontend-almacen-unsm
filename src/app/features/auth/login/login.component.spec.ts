import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const auth = {
    login: vi.fn(),
    consultarMisModulos: vi.fn(),
    clearSession: vi.fn(),
    landingUrl: () => '/articulos',
    canAccessModule: () => true,
  };

  beforeEach(() => {
    auth.login.mockReset().mockReturnValue(of({ exito: true }));
    auth.consultarMisModulos.mockReset().mockReturnValue(of({ datos: [] }));
    auth.clearSession.mockReset();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('usa login y consulta permisos antes de navegar aunque haya cambio de clave pendiente', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.loginForm.setValue({ usuario: ' admin ', clave: 'admin123' });
    component.onSubmit();
    expect(auth.login).toHaveBeenCalledWith({ usuario: 'admin', clave: 'admin123' });
    expect(auth.consultarMisModulos).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/articulos');
    expect(component.isLoading()).toBe(false);
  });

  it('no navega y limpia sesión cuando falla la carga de permisos', () => {
    auth.consultarMisModulos.mockReturnValue(
      throwError(() => new Error('Permisos no disponibles')),
    );
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.loginForm.setValue({ usuario: 'admin', clave: 'admin123' });
    component.onSubmit();
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
    expect(auth.clearSession).toHaveBeenCalledOnce();
    expect(component.errorMessage()).toBe('Permisos no disponibles');
    expect(component.isLoading()).toBe(false);
  });

  it('impide envíos concurrentes', () => {
    auth.login.mockReturnValue(new Subject());
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.loginForm.setValue({ usuario: 'admin', clave: 'admin123' });
    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    expect(auth.login).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('limita el acceso rápido a la configuración de desarrollo y usa autenticación real', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.onDevelopmentLogin();
    if (!environment.production && environment.developmentLogin) {
      expect(auth.login).toHaveBeenCalledWith(environment.developmentLogin);
      expect(auth.consultarMisModulos).toHaveBeenCalledOnce();
    } else {
      expect(auth.login).not.toHaveBeenCalled();
    }
  });
});
