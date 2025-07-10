// src/app/api/internaciones/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// --- CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Crea una nueva denuncia de internación.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      beneficiary_name,
      beneficiary_cuil,
      admissionDate,
      type,
      reason,
      requestingDoctor,
      notifyingProviderId,
    } = body;

    // Validación de datos esenciales
    if (!beneficiary_cuil || !beneficiary_name || !admissionDate || !notifyingProviderId) {
      return NextResponse.json({ message: 'Faltan datos obligatorios para la denuncia.' }, { status: 400 });
    }
    
    const newId = Date.now();

    const query = `
      INSERT INTO internments 
        (id, beneficiary_name, beneficiary_cuil, admission_date, type, reason, requesting_doctor, notifying_provider_id, source, status)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, 'Manual', 'Activa')
      RETURNING *;
    `;
    
    const values = [
      newId,
      beneficiary_name,
      beneficiary_cuil,
      admissionDate,
      type,
      reason,
      requestingDoctor,
      notifyingProviderId,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error("Error al crear la denuncia de internación:", error);
    return NextResponse.json({ message: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
