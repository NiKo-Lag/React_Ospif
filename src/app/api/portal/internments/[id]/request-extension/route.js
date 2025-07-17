// src/app/api/internment/[id]/request-extension/route.js

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
 * Añade una nueva solicitud de prórroga al historial de una internación.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params; // ID de la internación
    const { requestedDays, reason, requestingDoctor, observations } = await request.json();

    if (!requestedDays || !reason || !requestingDoctor) {
      return NextResponse.json({ message: 'Faltan datos obligatorios para la solicitud de prórroga.' }, { status: 400 });
    }

    // 1. Verificar la sesión del prestador para saber quién hace la solicitud
    const cookieStore = cookies();
    const token = cookieStore.get('token');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    const decodedToken = jwt.verify(token.value, JWT_SECRET);
    const providerId = decodedToken.id;

    // 2. Crear el objeto de la nueva solicitud de prórroga
    const newExtensionRequest = {
      id: `prorroga_${Date.now()}`,
      requested_at: new Date().toISOString(),
      requested_by_provider_id: providerId,
      requested_days: requestedDays,
      requesting_doctor: requestingDoctor,
      reason: reason,
      observations: observations,
      status: 'Pendiente de Auditoría', // Estado inicial
      auditor_id: null,
      audited_at: null,
      auditor_comment: null,
    };

    // 3. Actualizar el campo 'details' en la base de datos
    // Usamos jsonb_set para añadir la nueva solicitud a un array llamado 'extension_requests'
    const query = `
      UPDATE internments
      SET details = jsonb_set(
          COALESCE(details, '{}'::jsonb),
          '{extension_requests}',
          COALESCE(details->'extension_requests', '[]'::jsonb) || $1::jsonb
      )
      WHERE id = $2
      RETURNING *;
    `;
    
    const result = await pool.query(query, [JSON.stringify(newExtensionRequest), id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'No se pudo actualizar la internación. Verifique el ID.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Solicitud de prórroga enviada con éxito.' });

  } catch (error) {
    console.error("Error al solicitar prórroga:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
