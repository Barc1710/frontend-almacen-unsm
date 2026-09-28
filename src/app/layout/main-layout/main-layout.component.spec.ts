import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModuloResponse } from '../../core/models';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  const mockIsMobileSidebarOpen = signal<boolean>(false);
  const mockModules = signal<ModuloResponse[]>([]);
  const mockUserFullName = signal<string>('Admin Almacén');
  const mockUsername = signal<string>('admin');
  const mockUserProfile = signal<string>('ADMINISTRADOR');

  let layoutServiceSpy: {
    isMobileSidebarOpen: typeof mockIsMobileSidebarOpen;
    close: ReturnType<typeof vi.fn>;
    toggle: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockIsMobileSidebarOpen.set(false);

    layoutServiceSpy = {
      isMobileSidebarOpen: mockIsMobileSidebarOpen,
      close: vi.fn(),
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: LayoutService, useValue: layoutServiceSpy },
        {
          provide: AuthService,
          useValue: {
            modules: mockModules.asReadonly(),
            userFullName: mockUserFullName.asReadonly(),
            username: mockUsername.asReadonly(),
            userProfile: mockUserProfile.asReadonly(),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse satisfactoriamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe contener el sidebar de escritorio y el área principal con router-outlet', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside.hidden.lg\\:flex')).toBeTruthy();
    expect(compiled.querySelector('main')).toBeTruthy();
    expect(compiled.querySelector('app-topbar')).toBeTruthy();
  });

  it('debe mostrar el drawer móvil cuando isMobileSidebarOpen es true', () => {
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside[role="dialog"]')).toBeNull();

    mockIsMobileSidebarOpen.set(true);
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside[role="dialog"]')).toBeTruthy();
  });

  it('debe invocar layoutService.close() cuando se hace clic en el backdrop móvil', () => {
    mockIsMobileSidebarOpen.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const backdrop = compiled.querySelector('div.fixed.inset-0') as HTMLElement;
    expect(backdrop).toBeTruthy();

    backdrop.click();
    expect(layoutServiceSpy.close).toHaveBeenCalledTimes(1);
  });
});
