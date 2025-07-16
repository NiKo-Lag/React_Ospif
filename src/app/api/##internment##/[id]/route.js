// src/app/api/internments/[id]/route.js

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
 * Obtiene los detalles completos de una internación específica,
 * incluyendo las prácticas asociadas.
 */
export async function GET(request, { params }) {
  try {
    const { id } = params; // ID de la internación

    // 1. Verificar la sesión del prestador (o del admin, si es necesario en el futuro)
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token'); // Asumiendo que es para el portal
    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    jwt.verify(token.value, JWT_SECRET);

    // 2. Obtener los datos principales de la internación
    const internmentQuery = 'SELECT * FROM internments WHERE id = $1';
    const internmentResult = await pool.query(internmentQuery, [id]);

    if (internmentResult.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    const internment = internmentResult.rows[0];

    // 3. Obtener las prácticas asociadas a esa internación
    const practicesQuery = 'SELECT id, title, status, created_at FROM authorizations WHERE internment_id = $1 ORDER BY created_at DESC';
    const practicesResult = await pool.query(practicesQuery, [id]);
    const associatedPractices = practicesResult.rows;

    // 4. Combinar toda la información y devolverla
    const responsePayload = {
      ...internment,
      practices: associatedPractices,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Token inválido o expirado.' }, { status: 401 });
    }
    console.error(`Error al obtener el detalle de la internación ${params.id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
