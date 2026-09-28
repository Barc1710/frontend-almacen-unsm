import { Type } from '@angular/core';
import {
  LucideBox,
  LucideBoxes,
  LucideClipboardList,
  LucideFileText,
  LucideLayers,
  LucideLayoutDashboard,
  LucidePackage,
  LucidePackageCheck,
  LucideSettings,
  LucideTruck,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';

/**
 * Diccionario de mapeo entre códigos de módulo/iconos y los componentes SVG de Lucide.
 */
export const SIDEBAR_ICONS: Record<string, Type<unknown>> = {
  // Panel principal
  DASHBOARD: LucideLayoutDashboard,
  PANEL: LucideLayoutDashboard,
  INICIO: LucideLayoutDashboard,

  // Catálogo de artículos y bienes
  ARTICULOS: LucideBoxes,
  BIENES: LucideBoxes,
  PRODUCTOS: LucideBoxes,
  BOXES: LucideBoxes,
  BOX: LucideBox,

  // Control de inventario y kardex
  KARDEX: LucideClipboardList,
  INVENTARIO: LucideClipboardList,
  EXISTENCIAS: LucideClipboardList,
  CLIPBOARD: LucideClipboardList,

  // Entradas y recepción de suministros
  INGRESOS: LucideTruck,
  ENTRADAS: LucideTruck,
  RECEPCION: LucideTruck,
  TRUCK: LucideTruck,

  // Salidas y despachos de almacén
  EGRESOS: LucidePackageCheck,
  SALIDAS: LucidePackage,
  DESPACHOS: LucidePackageCheck,
  PACKAGE: LucidePackage,

  // Solicitudes, PECOSA y reportes
  SOLICITUDES: LucideFileText,
  PEDIDOS: LucideFileText,
  REQUERIMIENTOS: LucideFileText,
  PECOSA: LucideFileText,
  REPORTES: LucideFileText,
  DOCUMENTOS: LucideFileText,

  // Usuarios y control de acceso
  USUARIOS: LucideUsers,
  PERSONAL: LucideUsers,
  ROLES: LucideUsers,
  USERS: LucideUsers,

  // Categorías y clasificaciones
  CATEGORIAS: LucideLayers,
  GRUPOS: LucideLayers,
  FAMILIAS: LucideLayers,
  LAYERS: LucideLayers,

  // Almacenes y dependencias
  ALMACEN: LucideWarehouse,
  ALMACENES: LucideWarehouse,
  SEDES: LucideWarehouse,
  WAREHOUSE: LucideWarehouse,

  // Configuración del sistema
  CONFIGURACION: LucideSettings,
  PARAMETROS: LucideSettings,
  AJUSTES: LucideSettings,
  SETTINGS: LucideSettings,
};

/**
 * Componente de icono por defecto cuando el código o icono no coincide con el diccionario.
 */
export const DEFAULT_SIDEBAR_ICON: Type<unknown> = LucideBox;

/**
 * Obtiene el componente de icono SVG correspondiente para un código o nombre de icono.
 *
 * @param codigoOIcono Código de módulo (ej. 'ARTICULOS', 'KARDEX') o nombre de icono.
 * @returns Componente de icono Lucide resuelto o el icono por defecto.
 */
export function getSidebarIcon(codigoOIcono: string | null | undefined): Type<unknown> {
  if (!codigoOIcono) {
    return DEFAULT_SIDEBAR_ICON;
  }
  const normalizedKey = codigoOIcono.trim().toUpperCase();
  return SIDEBAR_ICONS[normalizedKey] ?? DEFAULT_SIDEBAR_ICON;
}
