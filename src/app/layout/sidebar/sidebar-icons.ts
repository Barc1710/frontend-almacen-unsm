import {
  LucideIcon,
  LucideArrowDownLeft,
  LucideArrowUpRight,
  LucideBox,
  LucideBoxes,
  LucideBuilding2,
  LucideClipboardList,
  LucideFileText,
  LucideLayers,
  LucideLayoutDashboard,
  LucidePackage,
  LucidePackageCheck,
  LucideSettings,
  LucideShieldCheck,
  LucideTruck,
  LucideUserCog,
  LucideUserRound,
  LucideUserRoundCog,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';

/**
 * Diccionario de mapeo entre códigos de módulo/iconos y los componentes SVG de Lucide.
 */
export const SIDEBAR_ICONS: Record<string, LucideIcon> = {
  // Panel principal
  DASHBOARD: LucideLayoutDashboard,
  'LAYOUT-DASHBOARD': LucideLayoutDashboard,
  LAYOUT_DASHBOARD: LucideLayoutDashboard,
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
  'CLIPBOARD-LIST': LucideClipboardList,
  CLIPBOARD_LIST: LucideClipboardList,

  // Entradas y recepción de suministros
  INGRESOS: LucideTruck,
  ENTRADAS: LucideTruck,
  RECEPCION: LucideTruck,
  TRUCK: LucideTruck,
  'ARROW-DOWN-LEFT': LucideArrowDownLeft,
  ARROW_DOWN_LEFT: LucideArrowDownLeft,

  // Salidas y despachos de almacén
  EGRESOS: LucidePackageCheck,
  SALIDAS: LucidePackage,
  DESPACHOS: LucidePackageCheck,
  PACKAGE: LucidePackage,
  'PACKAGE-CHECK': LucidePackageCheck,
  PACKAGE_CHECK: LucidePackageCheck,
  'ARROW-UP-RIGHT': LucideArrowUpRight,
  ARROW_UP_RIGHT: LucideArrowUpRight,

  // Solicitudes, PECOSA y reportes
  SOLICITUDES: LucideFileText,
  PEDIDOS: LucideFileText,
  REQUERIMIENTOS: LucideFileText,
  PECOSA: LucideFileText,
  REPORTES: LucideFileText,
  DOCUMENTOS: LucideFileText,
  'FILE-TEXT': LucideFileText,
  FILE_TEXT: LucideFileText,

  // Usuarios y control de acceso
  SEGURIDAD: LucideShieldCheck,
  'SHIELD-CHECK': LucideShieldCheck,
  SHIELD_CHECK: LucideShieldCheck,
  MANTENIMIENTO: LucideSettings,
  USUARIOS: LucideUsers,
  PERSONAL: LucideUsers,
  ROLES: LucideUsers,
  USERS: LucideUsers,
  USER: LucideUserRound,
  'USER-ROUND': LucideUserRound,
  USER_ROUND: LucideUserRound,
  'USER-ROUND-COG': LucideUserRoundCog,
  USER_ROUND_COG: LucideUserRoundCog,
  'USER-COG': LucideUserCog,
  USER_COG: LucideUserCog,
  PERFILES: LucideUsers,
  PERFIL: LucideUsers,
  PERMISOS: LucideShieldCheck,

  PROVEEDORES: LucideBuilding2,
  'BUILDING-2': LucideBuilding2,
  BUILDING_2: LucideBuilding2,
  CLIENTES: LucideUsers,
  AREAS: LucideBuilding2,
  FAMILIAS: LucideLayers,
  MARCAS: LucideBox,
  UBICACIONES: LucideWarehouse,
  ENCARGADOS: LucideUsers,
  ENCARGADOS_ALMACEN: LucideUserCog,
  UNIDADES_MEDIDA: LucideLayers,

  // Categorías y clasificaciones
  CATEGORIAS: LucideLayers,
  GRUPOS: LucideLayers,
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
export const DEFAULT_SIDEBAR_ICON: LucideIcon = LucideBox;

/**
 * Obtiene el componente de icono SVG correspondiente para un código o nombre de icono.
 * Soporta nombres en kebab-case ('arrow-down-left'), snake_case ('arrow_down_left') y mayúsculas.
 *
 * @param codigoOIcono Código de módulo (ej. 'ARTICULOS', 'KARDEX') o nombre de icono Lucide.
 * @returns Componente de icono Lucide resuelto o el icono por defecto.
 */
export function getSidebarIcon(codigoOIcono: string | null | undefined): LucideIcon {
  if (!codigoOIcono) {
    return DEFAULT_SIDEBAR_ICON;
  }
  const clean = codigoOIcono.trim().toUpperCase();
  const underscoreKey = clean.replace(/-/g, '_');
  const hyphenKey = clean.replace(/_/g, '-');

  if (Object.hasOwn(SIDEBAR_ICONS, clean)) {
    return SIDEBAR_ICONS[clean];
  }
  if (Object.hasOwn(SIDEBAR_ICONS, underscoreKey)) {
    return SIDEBAR_ICONS[underscoreKey];
  }
  if (Object.hasOwn(SIDEBAR_ICONS, hyphenKey)) {
    return SIDEBAR_ICONS[hyphenKey];
  }
  return DEFAULT_SIDEBAR_ICON;
}
