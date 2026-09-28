import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services';
import { LayoutService } from '../layout.service';
import { TopbarComponent } from './topbar.component';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;

  const mockUserFullName = signal<string>('Carlos Alvares');
  const mockUsername = signal<string>('calvares');
  const mockUserProfile = signal<string>('ADMINISTRADOR');

  let authServiceSpy: {
    userFullName: typeof mockUserFullName;
    username: typeof mockUsername;
    userProfile: typeof mockUserProfile;
    logout: ReturnType<typeof vi.fn>;
  };

  let layoutServiceSpy: {
    toggle: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockUserFullName.set('Carlos Alvares');
    mockUsername.set('calvares');
    mockUserProfile.set('ADMINISTRADOR');

    authServiceSpy = {
      userFullName: mockUserFullName,
      username: mockUsername,
      userProfile: mockUserProfile,
      logout: vi.fn(),
    };

    layoutServiceSpy = {
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LayoutService, useValue: layoutServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debe crearse satisfactoriamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar el nombre actualizado y usar el usuario como alternativa', async () => {
    const header = fixture.nativeElement as HTMLElement;
    expect(header.textContent).toContain('Carlos Alvares');
    mockUserFullName.set('Juan');
    await fixture.whenStable();
    expect(header.textContent).toContain('Juan');
    mockUserFullName.set('');
    await fixture.whenStable();
    expect(header.textContent).toContain('calvares');
  });

  it('debe alternar y cerrar el menú de perfil', () => {
    expect(component.isProfileMenuOpen()).toBe(false);

    component.toggleProfileMenu();
    expect(component.isProfileMenuOpen()).toBe(true);

    component.closeProfileMenu();
    expect(component.isProfileMenuOpen()).toBe(false);
  });

  it('debe llamar a layoutService.toggle() al presionar el botón hamburguesa', () => {
    component.toggleMobileSidebar();
    expect(layoutServiceSpy.toggle).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar el menú de perfil e invocar authService.logout() al cerrar sesión', () => {
    component.toggleProfileMenu();
    expect(component.isProfileMenuOpen()).toBe(true);

    component.logout();

    expect(component.isProfileMenuOpen()).toBe(false);
    expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
  });
});
