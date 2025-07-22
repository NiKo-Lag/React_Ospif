// src/app/api/portal/internments/[id]/request-extension/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route'; // RUTA CORREGIDA (AHORA SÍ)

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * Añade una nueva solicitud de prórroga al historial de una internación.
 */
export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = params;
    const { requestedDays, reason, requestingDoctor, observations } = await request.json();

    if (!requestedDays || !reason || !requestingDoctor) {
      return NextResponse.json({ message: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    // 1. Verificar estado actual de la internación
    const internmentRes = await client.query('SELECT status, details FROM internments WHERE id = $1 FOR UPDATE', [id]);
    if (internmentRes.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    
    const { status, details } = internmentRes.rows[0];
    if (!['INICIADA', 'ACTIVA'].includes(status)) {
      return NextResponse.json({ message: 'Acción no permitida. La internación no está activa.' }, { status: 403 });
    }

    // 2. Crear el objeto de la prórroga
    const newExtensionRequest = {
      id: `prorroga_${Date.now()}`,
      requested_at: new Date().toISOString(),
      requested_by_provider_id: session.user.id,
      requested_days: requestedDays,
      requesting_doctor: requestingDoctor,
      reason: reason,
      observations: observations,
      status: 'Pendiente de Auditoría', // Estado inicial
      auditor_id: null,
      audited_at: null,
      auditor_comment: null,
    };

    const existingExtensions = details?.extension_requests || [];
    const updatedExtensions = [...existingExtensions, newExtensionRequest];
    
    let newStatus = status;
    if (status === 'INICIADA') {
      newStatus = 'ACTIVA';
    }

    // 3. Actualizar la internación
    const query = `
      UPDATE internments
      SET 
        status = $1,
        details = jsonb_set(
            COALESCE(details, '{}'::jsonb),
            '{extension_requests}',
            $2::jsonb
        )
      WHERE id = $3
    `;
    
    await client.query(query, [newStatus, JSON.stringify(updatedExtensions), id]);
    
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Solicitud de prórroga enviada con éxito.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al solicitar prórroga:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
}
