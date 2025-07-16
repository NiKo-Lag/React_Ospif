// src/app/api/portal/my-authorizations/[id]/confirm/route.js

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
 * Confirma la asistencia a una práctica, cambiando su estado.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params; // ID de la autorización

    // 1. Verificar la sesión del prestador
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const decodedToken = jwt.verify(token.value, JWT_SECRET);
    const providerId = decodedToken.id;

    // 2. Actualizar el estado de la autorización a 'Realizada'
    // Se asegura de que solo el prestador asignado pueda confirmar la asistencia.
    const query = `
      UPDATE authorizations
      SET status = 'Realizada'
      WHERE id = $1 AND provider_id = $2 AND status = 'Autorizadas'
      RETURNING *;
    `;
    
    const result = await pool.query(query, [id, providerId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'No se pudo confirmar la asistencia. La autorización no fue encontrada, no le pertenece o no está en estado "Autorizadas".' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Asistencia confirmada con éxito.', authorization: result.rows[0] });

  } catch (error) {
    console.error("Error al confirmar asistencia:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
