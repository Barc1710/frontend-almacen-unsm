import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideBookOpen, LucideClipboardList } from '@lucide/angular';
import {
  KardexArticuloTabComponent,
  KardexGeneralTabComponent,
} from '../../components';
import { KardexTab } from '../../models';

@Component({
  selector: 'app-kardex-main',
  imports: [
    KardexGeneralTabComponent,
    KardexArticuloTabComponent,
    LucideClipboardList,
    LucideBookOpen,
  ],
  templateUrl: './kardex-main.component.html',
})
export class KardexMainComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Pestaña activa: 'general' (Auditoría General) o 'articulo' (Libro Mayor por Artículo) */
  readonly activeTab = signal<KardexTab>('general');

  /** ID del artículo seleccionado para la Pestaña 2 */
  readonly selectedArticuloId = signal<number | null>(null);

  ngOnInit(): void {
    // Deep Linking: Si la URL recibe ?articuloId=X o ?tab=articulo
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const idParam = params['articuloId'];
        const tabParam = params['tab'];

        if (idParam) {
          const numId = Number(idParam);
          if (!isNaN(numId) && numId > 0) {
            this.selectedArticuloId.set(numId);
            this.activeTab.set('articulo');
            return;
          }
        }

        if (tabParam === 'articulo') {
          this.activeTab.set('articulo');
        } else if (tabParam === 'general') {
          this.activeTab.set('general');
        }
      });
  }

  cambiarPestana(tab: KardexTab): void {
    this.activeTab.set(tab);

    if (tab === 'general') {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: 'general', articuloId: null },
        queryParamsHandling: 'merge',
      });
    } else {
      const artId = this.selectedArticuloId();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: 'articulo', articuloId: artId ?? null },
        queryParamsHandling: 'merge',
      });
    }
  }

  onAuditarArticuloDesdeGeneral(idArticulo: number): void {
    this.selectedArticuloId.set(idArticulo);
    this.activeTab.set('articulo');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'articulo', articuloId: idArticulo },
      queryParamsHandling: 'merge',
    });
  }

  onArticuloSeleccionadoEnTab2(idArticulo: number | null): void {
    this.selectedArticuloId.set(idArticulo);
    if (this.activeTab() === 'articulo') {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: 'articulo', articuloId: idArticulo },
        queryParamsHandling: 'merge',
      });
    }
  }
}
