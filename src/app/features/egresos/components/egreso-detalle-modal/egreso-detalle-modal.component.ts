import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  LucideAlertCircle,
  LucideBuilding2,
  LucideCalendar,
  LucideCircleAlert,
  LucideMapPin,
  LucidePackage,
  LucidePrinter,
  LucideTag,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { ModalDialogDirective } from '../../../../shared/directives/modal-dialog.directive';
import { EgresoConDetalles } from '../../models';

@Component({
  selector: 'app-egreso-detalle-modal',
  imports: [
    ModalDialogDirective,
    DatePipe,
    TitleCasePipe,
    LucideX,
    LucidePackage,
    LucideCircleAlert,
    LucideAlertCircle,
    LucideTag,
    LucideCalendar,
    LucideUser,
    LucideBuilding2,
    LucideMapPin,
    LucidePrinter,
  ],
  templateUrl: './egreso-detalle-modal.component.html',
})
export class EgresoDetalleModalComponent {
  readonly visible = input<boolean>(false);
  readonly egreso = input<EgresoConDetalles | null>(null);

  readonly cerrar = output<void>();
  readonly imprimir = output<EgresoConDetalles>();

  readonly totalArticulos = computed(() => {
    const e = this.egreso();
    return e?.detalles?.length ?? e?.totalItems ?? e?.totalArticulos ?? 0;
  });

  readonly totalUnidadesBienes = computed(() => {
    const e = this.egreso();
    if (!e || !e.detalles) return '0';
    const sum = e.detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
    return sum.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });

  readonly esBaja = computed(() => {
    const tipo = this.egreso()?.tipoEgreso;
    return tipo === 'BAJA_DETERIORO' || tipo === 'BAJA_VENCIMIENTO';
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
