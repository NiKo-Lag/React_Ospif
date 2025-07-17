// src/app/api/portal/my-authorizations/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * Obtiene solo las autorizaciones APROBADAS para el prestador que ha iniciado sesión.
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const decodedToken = jwt.verify(token.value, JWT_SECRET);
    const providerId = decodedToken.id;

    if (!providerId) {
        return NextResponse.json({ message: 'Token inválido: no contiene ID del prestador.' }, { status: 401 });
    }

    // --- CORRECCIÓN: Se añade el filtro por estado 'Autorizadas' ---
    const query = `
      SELECT 
        a.id,
        a.title,
        a.beneficiary_name,
        a.status,
        to_char(a.created_at, 'DD/MM/YYYY') as "creationDate"
      FROM authorizations a
      WHERE a.provider_id = $1 AND a.status = 'Autorizadas'
      ORDER BY a.created_at DESC;
    `;

    const result = await pool.query(query, [providerId]);

    return NextResponse.json(result.rows);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 });
    }
    console.error("Error al obtener las autorizaciones del prestador:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
