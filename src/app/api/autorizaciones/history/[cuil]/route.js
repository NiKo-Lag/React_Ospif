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

  if (!cuil || !/^\d{11}$/.test(cuil)) {
    return NextResponse.json({ message: 'Formato de CUIL inválido.' }, { status: 400 });
  }

  try {
    // --- CONSULTA A POSTGRESQL USANDO JSONB ---
    // Esta consulta busca dentro del campo `details` para encontrar el CUIL correspondiente.
    // El operador ->> extrae un campo de JSON como texto.
    const query = `
      SELECT 
        id, 
        to_char(created_at, 'DD/MM/YYYY') as date, 
        title, 
        status 
      FROM 
        authorizations 
      WHERE 
        details->'beneficiaryData'->>'cuil' = $1 
      ORDER BY 
        created_at DESC;
    `;
    
    const values = [cuil];
    const result = await pool.query(query, values);

    // Devolvemos las filas encontradas. Si no hay, será un array vacío, lo cual es correcto.
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error(`Error al obtener historial para CUIL ${cuil}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el historial.' }, { status: 500 });
  }
}