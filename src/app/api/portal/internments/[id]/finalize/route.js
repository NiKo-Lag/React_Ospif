// src/app/api/portal/internments/[id]/finalize/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const { id } = params;
  const client = await pool.connect();

  try {
    const { egreso_date, egreso_reason } = await request.json();

    if (!egreso_date || !egreso_reason) {
      return NextResponse.json({ message: 'Faltan la fecha y el motivo de egreso.' }, { status: 400 });
    }

    await client.query('BEGIN');
    
    // Obtener la internación y su estado actual para asegurar que pertenece al prestador
    const internmentResult = await client.query(
      'SELECT notifying_provider_id, status FROM internments WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (internmentResult.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    const { notifying_provider_id, status } = internmentResult.rows[0];

    if (notifying_provider_id !== session.user.id) {
      return NextResponse.json({ message: 'No tiene permiso para modificar esta internación.' }, { status: 403 });
    }

    // Comprobar que solo se puede finalizar una internación activa
    if (status !== 'ACTIVA') {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: `No se puede finalizar una internación que no está activa. Estado actual: ${status}` }, { status: 400 });
    }

    // Actualizar la internación
    const updateQuery = `
      UPDATE internments 
      SET 
        status = 'FINALIZADA',
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