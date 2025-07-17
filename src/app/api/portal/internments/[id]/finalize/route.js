// src/app/api/portal/internments/[id]/finalize/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function PATCH(request, { params }) {
  const { id } = params;

  const tokenCookie = cookies().get('token');
  if (!tokenCookie) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }
  const decodedSession = verifyToken(tokenCookie.value);
  if (!decodedSession) {
    return NextResponse.json({ message: 'Sesión inválida o expirada.' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const { egreso_date, egreso_reason } = await request.json();

    if (!egreso_date || !egreso_reason) {
      return NextResponse.json({ message: 'Faltan la fecha y el motivo de egreso.' }, { status: 400 });
    }

    await client.query('BEGIN');
    
    // Obtener la internación para asegurar que pertenece al prestador
    const internmentResult = await client.query(
      'SELECT notifying_provider_id FROM internments WHERE id = $1',
      [id]
    );

    if (internmentResult.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }

    if (internmentResult.rows[0].notifying_provider_id !== decodedSession.id) {
      return NextResponse.json({ message: 'No tiene permiso para modificar esta internación.' }, { status: 403 });
    }

    // Actualizar la internación
    const updateQuery = `
      UPDATE internments 
      SET 
        status = 'Finalizada', 
        egreso_date = $1,
        details = jsonb_set(
            COALESCE(details, '{}'::jsonb),
            '{egreso_reason}',
            $2::jsonb
        )
      WHERE id = $3
    `;

    // El motivo se guarda como un string JSON
    await client.query(updateQuery, [egreso_date, JSON.stringify(egreso_reason), id]);
    
    await client.query('COMMIT');
    
    return NextResponse.json({ message: 'Internación finalizada con éxito.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al finalizar la internación:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
} 