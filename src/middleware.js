// src/middleware.js

export { default } from "next-auth/middleware"

export const config = {
  // Aplicar middleware a todas las rutas dentro del grupo (app)
  matcher: ['/((?!api|login|_next/static|_next/image|favicon.ico).*)'],
}; 