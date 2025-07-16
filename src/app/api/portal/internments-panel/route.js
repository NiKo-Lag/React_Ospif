// src/app/api/portal/internments-panel/route.js

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
 * Obtiene todas las internaciones asociadas al prestador que ha iniciado sesión.
 */
export async function GET(request) {
  try {
    // 1. Verificar la sesión del prestador
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');

    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const decodedToken = jwt.verify(token.value, JWT_SECRET);
    const providerId = decodedToken.id;

    if (!providerId) {
        return NextResponse.json({ message: 'Token inválido: no contiene ID del prestador.' }, { status: 401 });
    }

    // 2. Consulta para obtener las internaciones filtradas por notifying_provider_id
    // --- CORRECCIÓN: Se eliminó un carácter 'a' sobrante que causaba el error de sintaxis. ---
    const query = `
      SELECT 
        i.id,
        i.beneficiary_name,
        i.beneficiary_cuil,
        to_char(i.admission_datetime, 'DD/MM/YYYY HH24:MI') as "admissionDate",
        i.admission_datetime as "admission_date_raw",
        i.status,
        i.character as "type",
        i.admission_reason as "reason",
        i.egreso_date,
        p.razonsocial as "provider_name"
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id
      WHERE i.notifying_provider_id = $1
      ORDER BY i.admission_datetime DESC;
    `;

    const result = await pool.query(query, [providerId]);

    return NextResponse.json(result.rows);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 });
    }
    console.error("Error al obtener las internaciones del prestador:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
