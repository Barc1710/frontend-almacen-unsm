import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  LucideBuilding2,
  LucideCalendar,
  LucideCircleAlert,
  LucidePackage,
  LucideTag,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { IngresoConDetalles } from '../../models';

@Component({
  selector: 'app-ingreso-detalle-modal',
  imports: [
    DatePipe,
    ModalDialogDirective,
    LucideX,
    LucideBuilding2,
    LucideCalendar,
    LucideUser,
    LucideTag,
    LucidePackage,
    LucideCircleAlert,
  ],
  templateUrl: './ingreso-detalle-modal.component.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class IngresoDetalleModalComponent {
  readonly visible = input<boolean>(false);
  readonly ingreso = input<IngresoConDetalles | null>(null);

  readonly cerrar = output<void>();

  readonly totalArticulos = computed(() => {
    const ing = this.ingreso();
    return ing?.detalles?.length ?? ing?.totalItems ?? ing?.totalArticulos ?? 0;
  });

  readonly totalUnidadesBienes = computed(() => {
    const ing = this.ingreso();
    if (!ing || !ing.detalles) return '0';
    const sum = ing.detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
    return sum.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });

  onEscape(): void {
    if (this.visible()) {
      this.onCerrar();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCerrar();
    }
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  formatCantidad(
    valor: number | null | undefined,
    permiteDecimales: boolean | null | undefined,
  ): string {
    const num = Number(valor ?? 0);
    const tieneDecimales = num % 1 !== 0;
    if (permiteDecimales || tieneDecimales) {
      return num.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return Math.round(num).toLocaleString('es-PE');
  }
}
