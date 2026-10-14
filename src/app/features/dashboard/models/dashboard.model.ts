export interface DashboardKpis {
  readonly totalArticulos: number;
  readonly articulosActivos: number;
  readonly articulosStockBajo: number;
  readonly articulosSinStock: number;
  readonly ingresosMes: number;
  readonly egresosMes: number;
  readonly totalProveedores: number;
  readonly totalClientes: number;
}

export interface MovimientoTendencia {
  readonly mes: string;
  readonly label: string;
  readonly ingresos: number;
  readonly egresos: number;
}

export interface StockFamilia {
  readonly idFamilia: number;
  readonly nombre: string;
  readonly totalArticulos: number;
  readonly saldoTotal: number;
}

export interface ArticuloStockCritico {
  readonly id: number;
  readonly codigo: string;
  readonly descripcion: string;
  readonly familia: string;
  readonly saldo: number;
  readonly cantidadMinima: number;
  readonly porcentaje: number;
  readonly unidadMedida: string;
}

export interface MovimientoReciente {
  readonly tipo: 'INGRESO' | 'EGRESO';
  readonly id: number;
  readonly codigo: string;
  readonly fecha: string;
  readonly entidad: string;
  readonly estado: string;
}

export interface TopArticuloConsumo {
  readonly idArticulo: number;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly totalConsumido: number;
}

export interface DashboardResumen {
  readonly kpis: DashboardKpis;
  readonly tendenciaMensual: MovimientoTendencia[];
  readonly distribucionFamilias: StockFamilia[];
  readonly topArticulosConsumo: TopArticuloConsumo[];
  readonly articulosCriticos: ArticuloStockCritico[];
  readonly ultimosMovimientos: MovimientoReciente[];
}
