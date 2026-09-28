import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideBoxes, LucideClipboardList, LucideLayoutDashboard } from '@lucide/angular';
import { ModuloResponse } from '../../core/models';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';
import { DEFAULT_SIDEBAR_ICON, getSidebarIcon, SIDEBAR_ICONS } from './sidebar-icons';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  const mockModules = signal<ModuloResponse[]>([
    {
      id: 2,
      codigo: 'KARDEX',
      nombre: 'Kardex Valorizado',
      url: '/kardex',
      icono: 'clipboard',
      orden: 2,
    },
    {
      id: 1,
      codigo: 'DASHBOARD',
      nombre: 'Panel de Control',
      url: '/dashboard',
      icono: 'dashboard',
      orden: 1,
    },
    {
      id: 3,
      codigo: 'ARTICULOS',
      nombre: 'Catálogo de Artículos',
      url: '/articulos',
      icono: 'boxes',
      orden: 3,
    },
  ]);

  let layoutServiceSpy: {
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    layoutServiceSpy = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            modules: mockModules.asReadonly(),
          },
        },
        {
          provide: LayoutService,
          useValue: layoutServiceSpy,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse satisfactoriamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe ordenar los módulos ascendentemente según su atributo orden', () => {
    const sorted = component.sortedModules();
    expect(sorted.length).toBe(3);
    expect(sorted[0].codigo).toBe('DASHBOARD');
    expect(sorted[0].orden).toBe(1);
    expect(sorted[1].codigo).toBe('KARDEX');
    expect(sorted[1].orden).toBe(2);
    expect(sorted[2].codigo).toBe('ARTICULOS');
    expect(sorted[2].orden).toBe(3);
  });

  it('debe resolver iconos reconocidos y aplicar fallback por defecto', () => {
    expect(component.getIcon('ARTICULOS')).toBe(LucideBoxes);
    expect(component.getIcon('KARDEX')).toBe(LucideClipboardList);
    expect(component.getIcon('DASHBOARD')).toBe(LucideLayoutDashboard);
    expect(component.getIcon('CODIGO_INEXISTENTE')).toBe(DEFAULT_SIDEBAR_ICON);
    expect(component.getIcon('')).toBe(DEFAULT_SIDEBAR_ICON);
  });

  it('debe invocar layoutService.close() al llamar a closeMobileMenu()', () => {
    component.closeMobileMenu();
    expect(layoutServiceSpy.close).toHaveBeenCalledTimes(1);
  });
});
