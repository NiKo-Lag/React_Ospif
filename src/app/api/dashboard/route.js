// src/app/api/dashboard/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  try {
    const authQuery = `
      SELECT 
        a.id, 
        'practice' as "requestType", 
        a.status, 
        a.title, 
        a.beneficiary_name as beneficiary,
        to_char(a.created_at, 'DD/MM/YYYY') as date, 
        a.is_important as "isImportant",
        p.razonSocial as provider_name, 
        u.name as auditor_name, 
        a.details, 
        a.created_at,
        (a.details->'beneficiaryData'->>'cuil') as beneficiary_cuil,
        a.provider_id as notifying_provider_id
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
      WHERE a.internment_id IS NULL;
    `;

    const internmentQuery = `
      SELECT 
        i.id, 
        'internment' as "requestType", 
        i.status, 
        i.reason as title, 
        i.beneficiary_name as beneficiary,
        to_char(i.admission_date, 'DD/MM/YYYY') as date, 
        false as "isImportant",
        p.razonSocial as provider_name, 
        NULL as auditor_name, 
        i.details, 
        i.created_at,
        i.beneficiary_cuil, 
        i.notifying_provider_id
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id;
    `;

    const [authResult, internmentResult] = await Promise.all([
      pool.query(authQuery),
      pool.query(internmentQuery)
    ]);

    const combinedResults = [...authResult.rows, ...internmentResult.rows];
    combinedResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error("Error al obtener datos para el dashboard:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
