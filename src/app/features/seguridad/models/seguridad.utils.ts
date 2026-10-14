import { Perfil } from './perfil.model';

/**
 * Determina de forma unificada si un perfil corresponde al perfil ADMINISTRADOR raíz (ID 1 o nombre ADMINISTRADOR/ADMIN).
 */
export function esPerfilAdminPrincipal(perfil: Perfil | null | undefined): boolean {
  if (!perfil) return false;
  const nombre = perfil.nombre?.trim().toUpperCase();
  return perfil.id === 1 || nombre === 'ADMINISTRADOR' || nombre === 'ADMIN';
}
