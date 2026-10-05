import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-pagination',
  imports: [FormsModule, LucideChevronLeft, LucideChevronRight],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly paginaActual = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly totalElementos = input<number>(0);
  readonly tamanioPagina = input<number>(10);
  readonly cargando = input<boolean>(false);
  readonly etiqueta = input<string>('registros');
  readonly colorActivo = input<'green' | 'cyan'>('green');

  readonly paginaChange = output<number>();
  readonly tamanioChange = output<number>();

  readonly paginasNumeros = computed<(number | string)[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual() + 1;

    if (total <= 0) return [];
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (actual <= 3) return [1, 2, 3, '...', total];
    if (actual >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', actual, '...', total];
  });

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.paginaChange.emit(nuevaPagina);
    }
  }

  irAPagina(pagina: number | string): void {
    if (typeof pagina === 'number') {
      this.cambiarPagina(pagina - 1);
    }
  }

  cambiarTamanio(nuevoTamanio: number): void {
    this.tamanioChange.emit(nuevoTamanio);
  }
}
