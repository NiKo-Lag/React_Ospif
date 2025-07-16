// src/app/api/portal/me/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * Devuelve los datos del prestador que ha iniciado sesión.
 */
export async function GET(request) {
  try {
    // 1. Obtener el token de la cookie
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');

    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    // 2. Verificar el token y devolver el payload (los datos del usuario)
    const decodedToken = jwt.verify(token.value, JWT_SECRET);

    return NextResponse.json(decodedToken);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 });
    }
    console.error("Error al obtener datos del prestador:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
