// src/app/api/portal/my-authorizations/[id]/reject/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Rechaza una práctica, cambiando su estado y guardando el motivo.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params; // ID de la autorización
    const { rejectionReason } = await request.json();

    if (!rejectionReason) {
      return NextResponse.json({ message: 'El motivo de rechazo es obligatorio.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const providerId = session.user.id;
    
    // La función jsonb_build_object crea un objeto JSON que se fusiona con el existente.
    const query = `
      UPDATE authorizations
      SET 
        status = 'Rechazada',
        details = details || jsonb_build_object('rejectionReason', $1)
      WHERE id = $2 AND provider_id = $3
      RETURNING *;
    `;
    
    const result = await pool.query(query, [rejectionReason, id, providerId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'No se pudo rechazar la autorización. No fue encontrada o no le pertenece.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Autorización rechazada con éxito.', authorization: result.rows[0] });

  } catch (error) {
    console.error("Error al rechazar autorización:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
