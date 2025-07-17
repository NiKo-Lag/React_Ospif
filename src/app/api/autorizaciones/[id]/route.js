// src/app/api/autorizaciones/[id]/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSession } from '@/lib/auth'; // Importamos para verificar permisos

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Endpoint para MODIFICAR campos específicos de una autorización
export async function PATCH(request, { params }) {
  // 1. Verificar si el usuario tiene sesión
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Acceso denegado.' }, { status: 403 });
  }

  // (Opcional) podrías verificar si el ROL del usuario tiene permiso para modificar
  // if(session.role !== 'auditor') { ... }

  const { id } = params;
  const { auditor, providerId, observations } = await request.json();

  try {
    // Usamos el operador || de JSONB para fusionar los nuevos datos con los existentes
    // Esto actualiza solo los campos que le pasamos dentro del objeto 'details'
    const query = `
      UPDATE authorizations
      SET details = details || $1::jsonb
      WHERE id = $2
      RETURNING *;
    `;

    const updatedDetails = JSON.stringify({
      auditorMedico: auditor,
      prestadorId: providerId,
      observations: observations
    });

    const values = [updatedDetails, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: `Autorización con ID ${id} no encontrada.` }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error(`Error al modificar autorización ID ${id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}