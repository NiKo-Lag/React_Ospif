// src/app/api/autorizaciones/history/[cuil]/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// --- CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request, { params }) {
  const { cuil } = params;

  // Validación del formato del CUIL.
  if (!cuil || !/^\d{11}$/.test(cuil)) {
    return NextResponse.json({ message: 'Formato de CUIL inválido.' }, { status: 400 });
  }

  try {
    // --- CONSULTA ROBUSTA ---
    // En lugar de buscar en una ruta JSON específica, convertimos todo el campo 'details'
    // a texto plano y buscamos el CUIL en él. Esto evita problemas por discrepancias
    // en la estructura del JSON.
    const query = `
      SELECT id, to_char(created_at, 'DD/MM/YYYY') as date, title, status 
      FROM authorizations 
      WHERE details::text LIKE '%' || $1 || '%'
      ORDER BY created_at DESC;
    `;
    
    const values = [cuil];
    const result = await pool.query(query, values);

    // Mensaje de depuración en el servidor si no se encuentran resultados.
    if (result.rows.length === 0) {
      console.log(`Búsqueda robusta no encontró historial para el CUIL: ${cuil}`);
    }

    // Devuelve los resultados encontrados (o un array vacío si no hay).
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error(`Error al obtener historial para CUIL ${cuil}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el historial.' }, { status: 500 });
  }
}
