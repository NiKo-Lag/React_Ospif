// src/app/api/portal/my-authorizations/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Obtiene solo las autorizaciones APROBADAS para el prestador que ha iniciado sesión.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const providerId = session.user.id;

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
    console.error("Error al obtener las autorizaciones del prestador:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
