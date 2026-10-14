import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideArrowDownLeft,
  LucideArrowUpRight,
  LucideBoxes,
  LucideLoader2,
  LucidePackage,
  LucideRefreshCw,
  LucideTrendingUp,
} from '@lucide/angular';
import * as echarts from 'echarts';
import { DashboardResumen } from './models';
import { DashboardService } from './services';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    LucidePackage,
    LucideAlertTriangle,
    LucideArrowDownLeft,
    LucideArrowUpRight,
    LucideRefreshCw,
    LucideTrendingUp,
    LucideBoxes,
    LucideLoader2,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly resumen = signal<DashboardResumen | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly fechaActual = signal<string>('');

  // Selector de tab para el Panel Operativo
  readonly tabOperativo = signal<'CRITICOS' | 'MOVIMIENTOS'>('CRITICOS');

  // Elementos DOM para los 3 gráficos ECharts
  readonly chartMovimientosEl = viewChild<ElementRef<HTMLDivElement>>('chartMovimientos');
  readonly chartFamiliasEl = viewChild<ElementRef<HTMLDivElement>>('chartFamilias');
  readonly chartTopConsumoEl = viewChild<ElementRef<HTMLDivElement>>('chartTopConsumo');

  private chartMovimientos?: echarts.ECharts;
  private chartFamilias?: echarts.ECharts;
  private chartTopConsumo?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private domListo = false;

  constructor() {
    afterNextRender(() => {
      this.domListo = true;
      this.inicializarResizeObserver();
      if (this.resumen()) {
        this.renderizarGraficos();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destruirGraficos();
    });
  }

  ngOnInit(): void {
    this.actualizarFechaCabecera();
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.dashboardService
      .obtenerResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.resumen.set(data);
          this.cargando.set(false);
          if (this.domListo) {
            setTimeout(() => this.renderizarGraficos(), 50);
          }
        },
        error: () => {
          this.error.set(
            'No se pudieron cargar los datos del dashboard. Verifique la conexión con el servidor.',
          );
          this.cargando.set(false);
        },
      });
  }

  private actualizarFechaCabecera(): void {
    const ahora = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const formateada = ahora.toLocaleDateString('es-PE', opciones);
    this.fechaActual.set(formateada.charAt(0).toUpperCase() + formateada.slice(1));
  }

  private renderizarGraficos(): void {
    const data = this.resumen();
    if (!data) return;

    this.renderizarMovimientos(data);
    this.renderizarFamilias(data);
    this.renderizarTopConsumo(data);
  }

  // GRÁFICO 1: Barras (Ingresos) + Línea (Egresos) por Mes
  private renderizarMovimientos(data: DashboardResumen): void {
    const el = this.chartMovimientosEl()?.nativeElement;
    if (!el) return;

    if (!this.chartMovimientos) {
      this.chartMovimientos = echarts.init(el, null, { renderer: 'svg' });
      this.resizeObserver?.observe(el);
    }

    const meses = (data.tendenciaMensual || []).map((m) => m.label);
    const ingresos = (data.tendenciaMensual || []).map((m) => m.ingresos);
    const egresos = (data.tendenciaMensual || []).map((m) => m.egresos);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#94a3b8' },
          lineStyle: { color: '#cbd5e1', type: 'dashed' },
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#1e293b', fontSize: 12 },
        extraCssText: 'box-shadow: 0 12px 24px -4px rgba(0,0,0,0.12); border-radius: 14px;',
        formatter: (params: unknown) => {
          const list = params as Array<{ seriesName: string; value: number; color: string; axisValueLabel: string }>;
          if (!list || list.length === 0) return '';
          let html = `<div class="font-bold text-slate-800 text-xs mb-2 border-b border-slate-100 pb-1">${list[0].axisValueLabel}</div>`;
          for (const item of list) {
            const isIngreso = item.seriesName === 'Ingresos';
            const dotColor = isIngreso ? '#00953b' : '#00a0df';
            const badgeBg = isIngreso ? '#e8f7ee' : '#e0f2fe';
            const badgeText = isIngreso ? '#007a30' : '#0284c7';
            html += `
              <div class="flex items-center justify-between gap-4 py-1 text-xs">
                <span class="flex items-center gap-1.5 font-medium text-slate-600">
                  <span class="inline-block size-2 rounded-full" style="background-color: ${dotColor}"></span>
                  ${item.seriesName}
                </span>
                <span class="font-bold font-mono px-2 py-0.5 rounded" style="background-color: ${badgeBg}; color: ${badgeText};">
                  ${item.value} mov.
                </span>
              </div>
            `;
          }
          return html;
        },
      },
      legend: {
        data: ['Ingresos', 'Egresos'],
        top: 0,
        right: 12,
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 600 },
      },
      grid: {
        top: 40,
        left: '2%',
        right: '2%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: meses,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, margin: 12 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: 'Ingresos',
          type: 'bar',
          barMaxWidth: 24,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#059669' },
              { offset: 1, color: '#00953b' },
            ]),
            borderRadius: [8, 8, 2, 2],
            shadowColor: 'rgba(0, 149, 59, 0.2)',
            shadowBlur: 8,
            shadowOffsetY: 3,
          },
          data: ingresos,
        },
        {
          name: 'Egresos',
          type: 'line',
          smooth: 0.45,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#00a0df',
            borderWidth: 2.5,
            borderColor: '#ffffff',
          },
          lineStyle: {
            width: 3.5,
            color: '#00a0df',
            shadowColor: 'rgba(0, 160, 223, 0.45)',
            shadowBlur: 10,
            shadowOffsetY: 4,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 160, 223, 0.35)' },
              { offset: 0.8, color: 'rgba(0, 160, 223, 0.05)' },
              { offset: 1, color: 'rgba(0, 160, 223, 0.0)' },
            ]),
          },
          data: egresos,
        },
      ],
    };

    this.chartMovimientos.setOption(option);
  }

  // GRÁFICO 2: Dona - Distribución por Familia
  private renderizarFamilias(data: DashboardResumen): void {
    const el = this.chartFamiliasEl()?.nativeElement;
    if (!el) return;

    if (!this.chartFamilias) {
      this.chartFamilias = echarts.init(el, null, { renderer: 'svg' });
      this.resizeObserver?.observe(el);
    }

    const familiasData = (data.distribucionFamilias || []).slice(0, 6).map((f) => ({
      name: f.nombre,
      value: f.totalArticulos,
      saldo: f.saldoTotal,
    }));

    const paleta = [
      '#00953b', // Verde UNSM
      '#00a0df', // Cian UNSM
      '#3b82f6', // Azul
      '#10b981', // Esmeralda
      '#f59e0b', // Ámbar
      '#8b5cf6', // Púrpura
    ];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#1e293b', fontSize: 12 },
        extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); border-radius: 12px;',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number; data: { saldo: number } };
          return `
            <div class="font-bold text-slate-800 mb-1">${p.name}</div>
            <div class="text-xs text-slate-500">Artículos: <span class="font-semibold text-slate-700">${p.value} (${p.percent}%)</span></div>
            <div class="text-xs text-slate-500">Saldo en stock: <span class="font-semibold text-slate-700">${p.data.saldo}</span></div>
          `;
        },
      },
      legend: {
        bottom: '0%',
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      color: paleta,
      series: [
        {
          name: 'Familias',
          type: 'pie',
          radius: ['48%', '75%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          padAngle: 3,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: { scaleSize: 6 },
          data: familiasData,
        },
      ],
    };

    this.chartFamilias.setOption(option);
  }

  // GRÁFICO 3: Barras Horizontales - Top 5 Artículos con Mayor Consumo
  private renderizarTopConsumo(data: DashboardResumen): void {
    const el = this.chartTopConsumoEl()?.nativeElement;
    if (!el) return;

    if (!this.chartTopConsumo) {
      this.chartTopConsumo = echarts.init(el, null, { renderer: 'svg' });
      this.resizeObserver?.observe(el);
    }

    const items = [...(data.topArticulosConsumo || [])].reverse();
    const articulos = items.map((i) =>
      i.descripcion.length > 22 ? i.descripcion.substring(0, 20) + '...' : i.descripcion,
    );
    const cantidades = items.map((i) => Number(i.totalConsumido ?? 0));
    const fullNames = items.map((i) => i.descripcion);
    const unidades = items.map((i) => (i.unidadMedida ? ` ${i.unidadMedida}` : ''));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#1e293b', fontSize: 12 },
        extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); border-radius: 12px;',
        formatter: (params: unknown) => {
          const list = params as Array<{ dataIndex: number }>;
          if (!list || list.length === 0) return '';
          const idx = list[0].dataIndex;
          return `
            <div class="font-bold text-slate-800 mb-1">${fullNames[idx]}</div>
            <div class="text-xs text-slate-500">Cantidad: <span class="font-bold text-unsm-green">${cantidades[idx]}${unidades[idx]}</span></div>
          `;
        },
      },
      grid: {
        top: 15,
        left: '3%',
        right: '14%',
        bottom: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: articulos,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#475569', fontSize: 11 },
      },
      series: [
        {
          name: 'Consumo',
          type: 'bar',
          barMaxWidth: 18,
          label: {
            show: true,
            position: 'right',
            formatter: (params: unknown) => {
              const p = params as { dataIndex: number; value: number };
              return `${p.value}${unidades[p.dataIndex] || ''}`;
            },
            color: '#007a30',
            fontSize: 11,
            fontWeight: 600,
          },
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#00953b' },
              { offset: 1, color: '#38a169' },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
          data: cantidades,
        },
      ],
    };

    this.chartTopConsumo.setOption(option);
  }

  private inicializarResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.chartMovimientos?.resize();
      this.chartFamilias?.resize();
      this.chartTopConsumo?.resize();
    });
  }

  private destruirGraficos(): void {
    this.resizeObserver?.disconnect();
    this.chartMovimientos?.dispose();
    this.chartFamilias?.dispose();
    this.chartTopConsumo?.dispose();
    this.chartMovimientos = undefined;
    this.chartFamilias = undefined;
    this.chartTopConsumo = undefined;
  }

  formatearNumero(num: number | null | undefined): string {
    const val = num ?? 0;
    return new Intl.NumberFormat('es-PE').format(val);
  }

  formatearFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  }
}
