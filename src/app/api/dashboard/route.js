// src/app/api/dashboard/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// --- CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  try {
    const authQuery = `
      SELECT 
        a.id, 'practice' as "requestType", a.status, a.title, a.beneficiary_name as beneficiary,
        to_char(a.created_at, 'DD/MM/YYYY') as date, a.is_important as "isImportant",
        p.razonSocial as provider_name, u.name as auditor_name, a.details, a.created_at
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
      WHERE a.internment_id IS NULL;
    `;

    const internmentQuery = `
      SELECT 
        i.id, 'internment' as "requestType", i.status, i.reason as title, i.beneficiary_name as beneficiary,
        to_char(i.admission_date, 'DD/MM/YYYY') as date, false as "isImportant",
        p.razonSocial as provider_name, NULL as auditor_name, i.details, i.created_at
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id;
    `;

    console.log("--- DEBUG: Ejecutando consultas para el dashboard ---");

    const [authResult, internmentResult] = await Promise.all([
      pool.query(authQuery),
      pool.query(internmentQuery)
    ]);

    // --- LOGS DE DEPURACIÓN ---
    console.log(`[DEBUG] Prácticas encontradas: ${authResult.rowCount}`);
    console.log(`[DEBUG] Internaciones encontradas: ${internmentResult.rowCount}`);
    if(authResult.rowCount > 0) console.log("[DEBUG] Primera práctica:", authResult.rows[0]);
    if(internmentResult.rowCount > 0) console.log("[DEBUG] Primera internación:", internmentResult.rows[0]);
    // --- FIN DE LOGS ---

    const combinedResults = [...authResult.rows, ...internmentResult.rows];
    combinedResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log(`[DEBUG] Total de solicitudes combinadas: ${combinedResults.length}`);

    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error("Error al obtener datos para el dashboard:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
