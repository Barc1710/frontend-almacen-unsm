import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideUserCheck,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';
import {
  CustodiaTabComponent,
  EncargadosTabComponent,
} from '../../components';

export type EncargadosTab = 'encargados' | 'custodia';

@Component({
  selector: 'app-encargados-main',
  imports: [
    EncargadosTabComponent,
    CustodiaTabComponent,
    LucideUserCheck,
    LucideUsers,
    LucideWarehouse,
  ],
  templateUrl: './encargados-main.component.html',
})
export class EncargadosMainComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<EncargadosTab>('encargados');

  ngOnInit(): void {
    // Lee query param opcional ?tab=custodia o ?tab=encargados
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'custodia' || tabParam === 'encargados') {
      this.activeTab.set(tabParam);
    }
  }

  cambiarPestana(tab: EncargadosTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
