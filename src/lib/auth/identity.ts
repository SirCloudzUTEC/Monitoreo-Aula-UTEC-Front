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

const PERMISOS_BASE: Record<Rol, readonly Permiso[]> = {
  // Usuario normal: solo visualización (más reportar y recibir alertas).
  miembro: ["ver_datos_autorizados", "reportar_incidente", "recibir_alertas"],
  // Administrador: además, atiende incidentes y gestiona aulas (crear
  // aulas, actualizar planos, umbrales, horario, Simulador).
  admin_operativo: [
    "ver_datos_autorizados",
    "reportar_incidente",
    "recibir_alertas",
    "atender_incidentes",
    "gestionar_dispositivos",
  ],
  // Superusuario: todo lo anterior, más gestionar cuentas (crear usuarios
  // y asignarles rol) e integraciones.
  superadmin: [
    "ver_datos_autorizados",
    "reportar_incidente",
    "recibir_alertas",
    "atender_incidentes",
    "gestionar_dispositivos",
    "gestionar_usuarios",
    "gestionar_integraciones",
  ],
};

/** Suspended or pending accounts hold no permissions at all. */
export function permisosDe(cuenta: CuentaUsuario): readonly Permiso[] {
  if (cuenta.estado !== "aprobada") return [];
  return PERMISOS_BASE[cuenta.rol];
}

export function puede(cuenta: CuentaUsuario, permiso: Permiso): boolean {
  return permisosDe(cuenta).includes(permiso);
}
