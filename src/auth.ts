// Auth.js (NextAuth v5) configuration: institutional identity only.
// Session strategy is JWT; there is no Auth.js database adapter — the
// `jwt` callback reads/writes the `usuarios` table directly, reusing the
// role/permission rules in src/lib/auth/identity.ts.

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/data/db";
import {
  correoSuperadmin,
  esCorreoInstitucional,
  estadoInicial,
  rolInicial,
  type Ambito,
  type CuentaUsuario,
  type EstadoCuenta,
  type Rol,
} from "@/lib/auth/identity";
import { autenticarConCredenciales } from "@/lib/auth/credentials";

declare module "next-auth" {
  interface Session {
    cuenta: CuentaUsuario | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    cuenta?: CuentaUsuario | null;
  }
}

interface UsuarioRow {
  email: string;
  nombre: string;
  rol: Rol;
  ambitos: Ambito[];
  estado: EstadoCuenta;
}

/**
 * There is no self-registration: every account other than the bootstrap
 * superadmin must already exist in `usuarios`, created by an admin through
 * `POST /api/usuarios` (which sets `rol`/`password_hash`/`estado`
 * directly). This only ever inserts a row for `SUPERADMIN_EMAIL` — the one
 * default account the platform bootstraps itself with — and otherwise just
 * refreshes the display name on an existing row.
 */
async function upsertUsuario(
  email: string,
  nombre: string,
): Promise<CuentaUsuario | null> {
  const sql = db();
  if (!sql) return null;
  const rol = rolInicial(email);
  const rows = (
    rol === "superadmin"
      ? await sql`
          insert into usuarios (email, nombre, rol, estado)
          values (${email}, ${nombre}, ${rol}, ${estadoInicial(rol)})
          on conflict (email) do update set nombre = excluded.nombre
          returning email, nombre, rol, ambitos, estado
        `
      : await sql`
          update usuarios set nombre = ${nombre}
          where email = ${email}
          returning email, nombre, rol, ambitos, estado
        `
  ) as UsuarioRow[];
  const row = rows[0];
  if (!row) return null;
  return {
    email: row.email,
    nombre: row.nombre,
    rol: row.rol,
    ambitos: row.ambitos,
    estado: row.estado,
  };
}

/**
 * Test-only bypass: lets e2e tests simulate an approved superadmin session
 * without a real Google sign-in. Only registered when the secret is set,
 * and that must never happen in production.
 */
const testBypassSecret = process.env.AUTH_TEST_BYPASS_SECRET;

const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  }),
  Credentials({
    id: "credenciales",
    name: "Correo y contraseña",
    credentials: {
      email: { label: "Correo", type: "text" },
      password: { label: "Contraseña", type: "password" },
    },
    authorize: async (credentials) => {
      const cuenta = await autenticarConCredenciales(
        credentials?.email,
        credentials?.password,
      );
      if (!cuenta) return null;
      return { id: cuenta.email, email: cuenta.email, name: cuenta.nombre };
    },
  }),
];

if (testBypassSecret && process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "test-bypass",
      name: "Test bypass",
      credentials: {
        secret: { label: "Secret", type: "password" },
        email: { label: "Email", type: "text" },
      },
      authorize: async (credentials) => {
        if (credentials?.secret !== testBypassSecret) return null;
        const email = credentials?.email;
        if (typeof email !== "string" || !esCorreoInstitucional(email))
          return null;
        return { id: email, email, name: email };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/acceso" },
  callbacks: {
    signIn: async ({ user, profile, account }) => {
      const email = user.email;
      if (!esCorreoInstitucional(email)) return false;
      if (account?.provider === "google" && profile?.email_verified !== true)
        return false;
      const sql = db();
      if (!sql) return false; // fail closed: no database, no session
      // No self-registration: only the bootstrap superadmin may sign in
      // without an existing row — everyone else must have been created by
      // an admin first (POST /api/usuarios).
      if (email.toLowerCase() === correoSuperadmin()) return true;
      const rows = await sql`
        select 1 from usuarios where email = ${email.toLowerCase()}`;
      return rows.length > 0;
    },
    jwt: async ({ token, user }) => {
      if (user?.email) {
        const cuenta = await upsertUsuario(user.email, user.name ?? "");
        if (!cuenta) return { ...token, cuenta: null };
        token.cuenta = cuenta;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.cuenta = token.cuenta ?? null;
      return session;
    },
  },
});
