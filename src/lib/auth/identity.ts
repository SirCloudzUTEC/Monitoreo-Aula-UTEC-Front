// Institutional identity for the UTEC campus platform.
// Access is restricted to @utec.edu.pe accounts. Authentication and account
// storage live in the Spring Boot backend; this module mirrors its role and
// permission rules on the client (to hide UI, never to authorize: the backend
// re-checks every request).

export const DOMINIO_INSTITUCIONAL = "utec.edu.pe";

export type Rol = "superadmin" | "admin_operativo" | "miembro";
export const ROLES = ["superadmin", "admin_operativo", "miembro"] as const satisfies readonly Rol[];

export type Ambito = "seguridad" | "mantenimiento" | "ti" | "bienestar";
export const AMBITOS = ["seguridad", "mantenimiento", "ti", "bienestar"] as const satisfies readonly Ambito[];

export type EstadoCuenta = "pendiente" | "aprobada" | "suspendida";

export interface CuentaUsuario {
  email: string;
  nombre: string;
  rol: Rol;
  /** Only operational admins carry scopes; empty otherwise. */
  ambitos: Ambito[];
  estado: EstadoCuenta;
}

/**
 * Accepts exactly `usuario@utec.edu.pe` (case-insensitive domain,
 * no subdomains, no plus-tricks in the domain part). Personal Gmail
 * accounts are rejected even though UTEC mail is hosted on Google.
 */
export function esCorreoInstitucional(email: unknown): email is string {
  if (typeof email !== "string" || email.length > 254) return false;
  const at = email.lastIndexOf("@");
  if (at <= 0) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (domain !== DOMINIO_INSTITUCIONAL) return false;
  // Conservative local-part check: letters, digits, dot, underscore, hyphen.
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/i.test(local);
}

export type Permiso =
  | "ver_datos_autorizados"
  | "reportar_incidente"
  | "recibir_alertas"
  | "atender_incidentes"
  | "gestionar_usuarios"
  | "gestionar_dispositivos"
  | "gestionar_integraciones";

export const PERMISOS = [
  "ver_datos_autorizados",
  "reportar_incidente",
  "recibir_alertas",
  "atender_incidentes",
  "gestionar_usuarios",
  "gestionar_dispositivos",
  "gestionar_integraciones",
] as const satisfies readonly Permiso[];

// Usuario normal: solo visualización (más reportar y recibir alertas).
const PERMISOS_MIEMBRO: readonly Permiso[] = ["ver_datos_autorizados", "reportar_incidente", "recibir_alertas"];
// Administrador: además, atiende incidentes y gestiona aulas (planos, umbrales, horario).
const PERMISOS_ADMIN: readonly Permiso[] = [...PERMISOS_MIEMBRO, "atender_incidentes", "gestionar_dispositivos"];

const PERMISOS_BASE: Record<Rol, readonly Permiso[]> = {
  miembro: PERMISOS_MIEMBRO,
  admin_operativo: PERMISOS_ADMIN,
  // Superusuario: todo lo anterior, más gestionar cuentas e integraciones.
  superadmin: [...PERMISOS_ADMIN, "gestionar_usuarios", "gestionar_integraciones"],
};

/** Suspended or pending accounts hold no permissions at all. */
export function permisosDe(cuenta: CuentaUsuario): readonly Permiso[] {
  if (cuenta.estado !== "aprobada") return [];
  return PERMISOS_BASE[cuenta.rol];
}

export function puede(cuenta: CuentaUsuario, permiso: Permiso): boolean {
  return permisosDe(cuenta).includes(permiso);
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  miembro: "Usuario (solo visualización)",
  admin_operativo: "Administrador (aulas y planos)",
  superadmin: "Superusuario (gestión de usuarios)",
};

/** Only operational admins carry scopes (mirrors the backend rule). */
export function ambitosPara(rol: Rol, ambitos: Ambito[]): Ambito[] {
  return rol === "admin_operativo" ? ambitos : [];
}

/** Why the role/scopes pair cannot be saved, or null. */
export function errorDeRol(rol: Rol, ambitos: Ambito[]): string | null {
  return rol === "admin_operativo" && ambitos.length === 0
    ? "Un administrador necesita al menos un ámbito (sin él no vería ningún incidente)."
    : null;
}

/** Same bounds as the backend (CambiarPasswordRequest). */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Returns the reason a new password is not acceptable, or null. */
export function validarPasswordNueva(actual: string, nueva: string, repetida: string): string | null {
  if (nueva.length < PASSWORD_MIN) return `La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (nueva.length > PASSWORD_MAX) return `La contraseña nueva no puede superar ${PASSWORD_MAX} caracteres.`;
  if (nueva === actual) return "La contraseña nueva debe ser distinta de la actual.";
  if (nueva !== repetida) return "Las contraseñas nuevas no coinciden.";
  return null;
}
