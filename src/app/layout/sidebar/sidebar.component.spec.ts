import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModuloResponse } from '../../core/models';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';
import { SidebarComponent } from './sidebar.component';
import { DashboardComponent } from '../../features/dashboard/dashboard.component';

const article: ModuloResponse = {
  id: 1,
  codigo: 'ARTICULOS',
  nombre: 'Catálogo autorizado',
  url: '/articulos',
  icono: 'boxes',
  orden: 1,
};

const provider: ModuloResponse = {
  id: 2,
  codigo: 'PROVEEDORES',
  nombre: 'Proveedores',
  url: '/mantenimiento/proveedores',
  icono: null,
  orden: 2,
};

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  const modules = signal<ModuloResponse[]>([]);
  const isAdmin = signal<boolean>(false);
  const close = vi.fn();

  beforeEach(async () => {
    modules.set([article]);
    isAdmin.set(false);
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          { path: 'articulos', component: DashboardComponent },
          { path: 'mantenimiento/proveedores', component: DashboardComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            modules: modules.asReadonly(),
            isAdmin: isAdmin.asReadonly(),
          },
        },
        { provide: LayoutService, useValue: { close } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
  });

  it('muestra solamente los módulos autorizados devueltos por el backend', () => {
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.querySelectorAll('a')).toHaveLength(1);
    expect(nav.textContent).toContain('Catálogo autorizado');
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/articulos');
  });

  it('actualiza los enlaces cuando cambian los módulos', async () => {
    modules.set([]);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.querySelectorAll('a')).toHaveLength(0);
    expect(nav.textContent).toContain('No hay módulos disponibles');
  });

  it('muestra múltiples módulos devueltos por el backend', async () => {
    modules.set([article, provider]);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.querySelectorAll('a')).toHaveLength(2);
    expect(nav.textContent).toContain('Catálogo autorizado');
    expect(nav.textContent).toContain('Proveedores');
  });

  it('cierra el menú móvil al invocar closeMobileMenu', () => {
    fixture.componentInstance.closeMobileMenu();
    expect(close).toHaveBeenCalledOnce();
  });

  it('muestra el grupo Seguridad si existen submódulos de seguridad', async () => {
    modules.set([
      article,
      {
        id: 3,
        codigo: 'USUARIOS',
        nombre: 'Usuarios',
        url: '/seguridad/usuarios',
        icono: null,
        orden: 3,
      },
    ]);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.textContent).toContain('Seguridad');
  });
});
