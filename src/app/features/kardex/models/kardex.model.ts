export type TipoMovimiento =
  | 'SALDO_INICIAL'
  | 'INGRESO'
  | 'EGRESO'
  | 'REVERSO_EGRESO'
  | 'REVERSO_INGRESO'
  | 'AJUSTE'
  | 'BAJA';

export interface KardexMovimiento {
  readonly id: number;
  readonly idArticulo: number;
  readonly codigoArticulo: string;
  readonly descripcionArticulo: string;
  readonly fecha: string;
  readonly tipoMovimiento: TipoMovimiento;
  readonly documentoTipo: string;
  readonly documentoId: number;
  readonly documentoReferencia: string;
  readonly entrada: number;
  readonly salida: number;
  readonly saldoResultante: number;
  readonly idUsuario: number;
  readonly usuarioResponsable: string;
  readonly unidadMedida?: string;
  readonly permiteDecimales?: boolean;
}

export interface KardexFiltros {
  desde?: string;
  hasta?: string;
  tipoMovimiento?: TipoMovimiento | '';
  termino?: string;
  page?: number;
  size?: number;
}

export interface KardexBalance {
  stockInicial: number;
  totalEntradas: number;
  totalSalidas: number;
  saldoActual: number;
}

export type KardexTab = 'general' | 'articulo';

export interface TipoMovimientoBadgeConfig {
  readonly label: string;
  readonly badgeClass: string;
}

export const TIPO_MOVIMIENTO_BADGES: Record<TipoMovimiento, TipoMovimientoBadgeConfig> = {
  SALDO_INICIAL: {
    label: 'Saldo Inicial',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  INGRESO: {
    label: 'Ingreso',
    badgeClass: 'bg-emerald-50 text-emerald-700',
  },
  EGRESO: {
    label: 'Egreso',
    badgeClass: 'bg-amber-50 text-amber-700',
  },
  REVERSO_EGRESO: {
    label: 'Reverso Egreso',
    badgeClass: 'bg-cyan-50 text-cyan-700',
  },
  REVERSO_INGRESO: {
    label: 'Reverso Ingreso',
    badgeClass: 'bg-purple-50 text-purple-700',
  },
  AJUSTE: {
    label: 'Ajuste',
    badgeClass: 'bg-indigo-50 text-indigo-700',
  },
  BAJA: {
    label: 'Baja',
    badgeClass: 'bg-rose-50 text-rose-700',
  },
};
