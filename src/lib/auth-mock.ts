const COOKIE_NAME = "utec_session";
const STORAGE_KEY = "utec_admin_nombre";

export interface SesionAdmin {
  nombre: string;
  email: string;
}

function setCookie(value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function login(email: string, _password: string): SesionAdmin {
  const nombre = email.includes("@") ? email.split("@")[0] : "Administrador";
  const sesion: SesionAdmin = { nombre: capitalizar(nombre), email };
  setCookie("1", 7);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
  }
  return sesion;
}

export function logout() {
  clearCookie();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getSession(): SesionAdmin | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SesionAdmin;
  } catch {
    return null;
  }
}

function capitalizar(texto: string): string {
  return texto
    .split(/[._-]/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}
