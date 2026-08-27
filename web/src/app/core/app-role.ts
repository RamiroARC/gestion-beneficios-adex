export const APP_ROLES = ['Administrador', 'Operador', 'Consulta', 'GestionBeneficios'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  Administrador: 'Administrador',
  Operador: 'Operador',
  Consulta: 'Consulta',
  GestionBeneficios: 'Gestión de beneficios'
};

export const ROLE_HINTS: Record<AppRole, string> = {
  Administrador: 'Acceso completo: operación, catálogo, comunicaciones y auditoría.',
  Operador: 'Operación diaria: empresas, alumnos, contrataciones, canjes y cargas.',
  Consulta: 'Solo lectura en módulos operativos.',
  GestionBeneficios: 'Administración del catálogo de beneficios y consulta operativa.'
};

export type NavItem = {
  path: string;
  label: string;
  icon: string;
  roles: readonly AppRole[];
  group?: 'primary' | 'more';
};

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Inicio', icon: 'home', roles: APP_ROLES, group: 'primary' },
  { path: '/empresas', label: 'Empresas', icon: 'business', roles: APP_ROLES, group: 'primary' },
  { path: '/alumnos', label: 'Alumnos', icon: 'school', roles: APP_ROLES, group: 'primary' },
  { path: '/contrataciones', label: 'Contrataciones', icon: 'work', roles: APP_ROLES, group: 'primary' },
  { path: '/puntos', label: 'Puntos', icon: 'stars', roles: APP_ROLES, group: 'primary' },
  { path: '/beneficios', label: 'Beneficios', icon: 'card_giftcard', roles: APP_ROLES, group: 'primary' },
  { path: '/canjes', label: 'Canjes', icon: 'redeem', roles: APP_ROLES, group: 'primary' },
  { path: '/cargas', label: 'Carga masiva', icon: 'upload_file', roles: ['Administrador', 'Operador'], group: 'more' },
  { path: '/comunicaciones', label: 'Comunicaciones', icon: 'mail', roles: ['Administrador'], group: 'more' },
  { path: '/auditoria', label: 'Auditoría', icon: 'history', roles: ['Administrador'], group: 'more' }
];

export function isAppRole(value: string | null | undefined): value is AppRole {
  return !!value && (APP_ROLES as readonly string[]).includes(value);
}

export function hasAnyRole(role: string | null | undefined, allowed: readonly AppRole[]): boolean {
  return !!role && isAppRole(role) && allowed.includes(role);
}

export function canSyncEmpresa(role: string | null | undefined): boolean {
  return hasAnyRole(role, ['Administrador', 'Operador']);
}

export function canSyncAllEmpresas(role: string | null | undefined): boolean {
  return role === 'Administrador';
}

export function canWriteOperacion(role: string | null | undefined): boolean {
  return hasAnyRole(role, ['Administrador', 'Operador']);
}

export function canManageBeneficios(role: string | null | undefined): boolean {
  return hasAnyRole(role, ['Administrador', 'GestionBeneficios']);
}

export function canAdminComunicaciones(role: string | null | undefined): boolean {
  return role === 'Administrador';
}

export function canProcesarVencimientos(role: string | null | undefined): boolean {
  return role === 'Administrador';
}

export function navForRole(role: string | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => hasAnyRole(role, item.roles));
}

export function primaryNavForRole(role: string | null | undefined): NavItem[] {
  return navForRole(role).filter((item) => item.group !== 'more');
}

export function moreNavForRole(role: string | null | undefined): NavItem[] {
  return navForRole(role).filter((item) => item.group === 'more');
}

export function routeAllowed(path: string, role: string | null | undefined): boolean {
  const item = NAV_ITEMS.find((n) => path === n.path || path.startsWith(`${n.path}/`));
  if (!item) return true;
  return hasAnyRole(role, item.roles);
}
