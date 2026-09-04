import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RUTAS_PROTEGIDAS = ["/dashboard", "/aulas", "/alertas", "/footprint", "/configuracion"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protegida = RUTAS_PROTEGIDAS.some((ruta) => pathname.startsWith(ruta));
  if (!protegida) return NextResponse.next();

  const tieneSesion = request.cookies.has("utec_session");
  if (!tieneSesion) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/aulas/:path*", "/alertas/:path*", "/footprint/:path*", "/configuracion/:path*"],
};
