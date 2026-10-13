import { Perfil } from './perfil.model';
import { Usuario } from './usuario.model';

/**
 * Determina de forma unificada si un usuario es el Administrador principal del sistema (ID 1 o username 'admin').
 * Los administradores principales no pueden ser suspendidos ni degradados desde la interfaz.
 */
export function esUsuarioAdminPrincipal(user: Usuario | null | undefined): boolean {
  if (!user) return false;
  return user.id === 1 || user.usuario?.trim().toLowerCase() === 'admin';
}

/**
 * Determina de forma unificada si un perfil corresponde al perfil ADMINISTRADOR raíz (ID 1 o nombre ADMINISTRADOR/ADMIN).
 */
export function esPerfilAdminPrincipal(perfil: Perfil | null | undefined): boolean {
  if (!perfil) return false;
  const nombre = perfil.nombre?.trim().toUpperCase();
  return perfil.id === 1 || nombre === 'ADMINISTRADOR' || nombre === 'ADMIN';
}
