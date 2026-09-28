import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let service: LayoutService;
  let routerEvents$: Subject<unknown>;

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();

    TestBed.configureTestingModule({
      providers: [
        LayoutService,
        {
          provide: Router,
          useValue: {
            events: routerEvents$.asObservable(),
          },
        },
      ],
    });

    service = TestBed.inject(LayoutService);
  });

  it('debe inicializarse con el menú móvil cerrado (false)', () => {
    expect(service.isMobileSidebarOpen()).toBe(false);
  });

  it('debe alternar el estado del menú con toggle()', () => {
    service.toggle();
    expect(service.isMobileSidebarOpen()).toBe(true);

    service.toggle();
    expect(service.isMobileSidebarOpen()).toBe(false);
  });

  it('debe abrir explícitamente con open()', () => {
    service.open();
    expect(service.isMobileSidebarOpen()).toBe(true);
  });

  it('debe cerrar explícitamente con close()', () => {
    service.open();
    expect(service.isMobileSidebarOpen()).toBe(true);

    service.close();
    expect(service.isMobileSidebarOpen()).toBe(false);
  });

  it('debe cerrar automáticamente el menú móvil ante un evento NavigationEnd', () => {
    service.open();
    expect(service.isMobileSidebarOpen()).toBe(true);

    routerEvents$.next(new NavigationEnd(1, '/articulos', '/articulos'));

    expect(service.isMobileSidebarOpen()).toBe(false);
  });
});
