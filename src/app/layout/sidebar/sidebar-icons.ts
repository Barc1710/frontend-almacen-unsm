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
  LucideTag,
  LucideTags,
  LucideTruck,
  LucideUserCheck,
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

  // Grupo Inventario y submódulos (Artículos, Familias, Marcas)
  INVENTARIO: LucideBoxes,
  ARTICULOS: LucidePackage,
  INVENTARIO_ARTICULOS: LucidePackage,
  FAMILIAS: LucideLayers,
  INVENTARIO_FAMILIAS: LucideLayers,
  MARCAS: LucideTags,
  INVENTARIO_MARCAS: LucideTags,
  BIENES: LucideBoxes,
  PRODUCTOS: LucideBoxes,
  BOXES: LucideBoxes,
  BOX: LucideBox,
  PACKAGE: LucidePackage,
  LAYERS: LucideLayers,
  TAGS: LucideTags,
  TAG: LucideTag,

  // Control de inventario y kardex
  KARDEX: LucideClipboardList,
  EXISTENCIAS: LucideClipboardList,
  CLIPBOARD: LucideClipboardList,
  'CLIPBOARD-LIST': LucideClipboardList,
  CLIPBOARD_LIST: LucideClipboardList,

  // Entradas y recepción de suministros
  INGRESOS: LucideArrowDownLeft,
  ENTRADAS: LucideArrowDownLeft,
  RECEPCION: LucideTruck,
  TRUCK: LucideTruck,
  'ARROW-DOWN-LEFT': LucideArrowDownLeft,
  ARROW_DOWN_LEFT: LucideArrowDownLeft,

  // Salidas y despachos de almacén
  EGRESOS: LucideArrowUpRight,
  SALIDAS: LucideArrowUpRight,
  DESPACHOS: LucidePackageCheck,
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

  // Usuarios y control de acceso (Grupo Seguridad)
  SEGURIDAD: LucideShieldCheck,
  SEGURIDAD_USUARIOS: LucideUsers,
  SEGURIDAD_PERFILES: LucideShieldCheck,
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

  // Proveedores y Clientes
  PROVEEDORES: LucideTruck,
  'BUILDING-2': LucideBuilding2,
  BUILDING_2: LucideBuilding2,
  CLIENTES: LucideBuilding2,
  AREAS: LucideBuilding2,

  // Encargados
  ENCARGADOS: LucideUserCheck,
  ENCARGADO: LucideUserCheck,
  'USER-CHECK': LucideUserCheck,
  USER_CHECK: LucideUserCheck,
  ENCARGADOS_ALMACEN: LucideUserCog,
  UNIDADES_MEDIDA: LucideLayers,

  // Categorías y clasificaciones
  CATEGORIAS: LucideLayers,
  GRUPOS: LucideLayers,

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
