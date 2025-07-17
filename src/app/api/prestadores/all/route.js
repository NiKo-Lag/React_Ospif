// src/app/api/prestadores/all/route.js

import { NextResponse } from 'next/server';
<<<<<<< HEAD

export async function GET(request) {
  // En el futuro, esto leerá de tu base de datos SQLite.
  // Por ahora, usamos datos de prueba para que el formulario funcione.
  const mockProviders = [
    { id: 1, razonSocial: "Hospital Italiano", estado: "activo" },
    { id: 2, razonSocial: "Sanatorio Finochietto", estado: "activo" },
    { id: 3, razonSocial: "Centro de Diagnóstico Dr. Rossi", estado: "activo" },
    { id: 4, razonSocial: "Swiss Medical Center", estado: "inactivo" },
  ];

  const activeProviders = mockProviders.filter(p => p.estado === 'activo');

  return NextResponse.json(activeProviders);
}
=======
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
>>>>>>> master
