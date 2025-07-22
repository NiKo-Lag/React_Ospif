// src/app/api/autorizaciones/[id]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

/**
 * Endpoint para MODIFICAR el estado de una autorización y registrarlo en la trazabilidad.
 */
export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  // 1. Verificar autenticación y rol (ej. admin o auditor pueden cambiar estados)
  if (!session || !['admin', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;
  const { status: newStatus } = await request.json();

  if (!newStatus) {
    return NextResponse.json({ message: 'No se proporcionó un nuevo estado.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Crear el nuevo evento de trazabilidad
    const newEvent = {
      date: new Date().toISOString(),
      description: `El estado cambió a '${newStatus}'.`,
    };

    // 3. Actualizar el estado Y la trazabilidad en una única consulta atómica
    const query = `
      UPDATE authorizations
      SET 
        status = $1,
        details = jsonb_set(
          COALESCE(details, '{}'::jsonb),
          '{events}',
          COALESCE(details->'events', '[]'::jsonb) || $2::jsonb
        )
      WHERE id = $3
      RETURNING *;
    `;

    const values = [newStatus, JSON.stringify(newEvent), id];
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: `Autorización con ID ${id} no encontrada.` }, { status: 404 });
    }
    
    await client.query('COMMIT');
    return NextResponse.json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error al modificar estado de autorización ID ${id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
}