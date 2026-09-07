// Institutional identity for the UTEC campus platform.
// Access is restricted to @utec.edu.pe accounts. Tokens are verified
// server-side against the provider confirmed by UTEC IT; this module owns
// the domain and role rules, which are provider-agnostic.

export const DOMINIO_INSTITUCIONAL = "utec.edu.pe";

export type Rol = "superadmin" | "admin_operativo" | "miembro";

export type Ambito = "seguridad" | "mantenimiento" | "ti" | "bienestar";

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

/** The configured superadmin account, if declared server-side. */
export function correoSuperadmin(): string | null {
  const value = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return value && esCorreoInstitucional(value) ? value : null;
}

/** Role granted to a verified institutional email on first sign-in. */
export function rolInicial(email: string): Rol {
  const superadmin = correoSuperadmin();
  return superadmin !== null && email.toLowerCase() === superadmin
    ? "superadmin"
    : "miembro";
}

/**
 * New accounts other than the superadmin start pending until approved.
 * The superadmin account is approved automatically so the platform can
 * be bootstrapped without a second operator.
 */
export function estadoInicial(rol: Rol): EstadoCuenta {
  return rol === "superadmin" ? "aprobada" : "pendiente";
}

export type Permiso =
  | "ver_datos_autorizados"
  | "reportar_incidente"
  | "recibir_alertas"
  | "atender_incidentes"
  | "gestionar_usuarios"
  | "gestionar_dispositivos"
  | "gestionar_integraciones";

const PERMISOS_BASE: Record<Rol, readonly Permiso[]> = {
  miembro: ["ver_datos_autorizados", "reportar_incidente", "recibir_alertas"],
  admin_operativo: [
    "ver_datos_autorizados",
    "reportar_incidente",
    "recibir_alertas",
    "atender_incidentes",
  ],
  superadmin: [
    "ver_datos_autorizados",
    "reportar_incidente",
    "recibir_alertas",
    "atender_incidentes",
    "gestionar_usuarios",
    "gestionar_dispositivos",
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

/**
 * Whether the institutional identity provider is configured server-side.
 * Sign-in must stay visibly pending until UTEC IT confirms the provider
 * (Google or Microsoft) and its client ID is installed as an env var.
 */
export function proveedorIdentidadConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.MICROSOFT_OAUTH_CLIENT_ID,
  );
}
