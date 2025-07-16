// src/app/api/prestadores/all/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// --- CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request) {
  try {
    // --- Consulta a la base de datos---
    // Se obtiene el id y la razón social de todos los prestadores activos.
    const query = `
      SELECT 
        id, 
        "razonsocial"
      FROM prestadores 
      WHERE estado = 'activo' 
      ORDER BY "razonsocial" ASC;
    `;
    
    const result = await pool.query(query);
    
    // Devolvemos la lista de prestadores obtenida de la base de datos.
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error("Error al obtener prestadores:", error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener los prestadores.' }, { status: 500 });
  }
}
