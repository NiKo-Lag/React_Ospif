// src/app/api/portal/internments/[id]/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * Obtiene los detalles completos de una internación específica,
 * incluyendo las prácticas asociadas.
 */
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { id } = params; // ID de la internación

    // Obtener los datos principales de la internación
    const internmentQuery = 'SELECT * FROM internments WHERE id = $1';
    const internmentResult = await pool.query(internmentQuery, [id]);

    if (internmentResult.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    const internment = internmentResult.rows[0];

    // 3. Obtener las prácticas asociadas
    const practicesQuery = 'SELECT id, title, status, created_at FROM authorizations WHERE internment_id = $1 ORDER BY created_at DESC';
    const practicesResult = await pool.query(practicesQuery, [id]);
    
    // 4. Combinar toda la información
    // ¡CORRECCIÓN! No desempaquetar 'details'. Añadir 'practices' dentro de 'details'.
    const details = internment.details || {};
    details.practices = practicesResult.rows; // Añadimos las prácticas aquí

    const responsePayload = {
      ...internment,
      details: details, // Enviamos el objeto 'details' completo y enriquecido
    };
    
    // Eliminar 'details' del nivel superior si ya lo hemos asignado
    delete responsePayload.details.details;


    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error(`Error al obtener el detalle de la internación ${params.id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
