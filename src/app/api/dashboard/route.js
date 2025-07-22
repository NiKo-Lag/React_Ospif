// src/app/api/dashboard/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { calculateBusinessDeadline } from '@/lib/date-utils';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  try {
    const queryParams = [];
    
    // NOTA: Se ha reestructurado la lógica para evitar errores de sintaxis SQL.
    let authQuery = `
      SELECT a.id, 'practice' as "requestType", a.status, a.title, 
             a.beneficiary_name as beneficiary, to_char(a.created_at, 'DD/MM/YYYY') as date, 
             a.is_important as "isImportant", p.razonsocial as provider_name,
             u.name as auditor_name, a.details, a.created_at,
             (a.details->'beneficiaryData'->>'cuil') as beneficiary_cuil,
             a.provider_id as notifying_provider_id
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
    `;
    
    let internmentQuery = `
      SELECT i.id, 'internment' as "requestType", i.status, i.admission_reason as title,
             i.beneficiary_name as beneficiary, to_char(i.admission_datetime, 'DD/MM/YYYY') as date,
             false as "isImportant", p.razonsocial as provider_name,
             NULL as auditor_name, i.details, i.created_at,
             i.beneficiary_cuil, i.notifying_provider_id
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id
    `;

    // Se añaden los filtros correctos según el rol
    if (userRole === 'provider') {
        authQuery += ' WHERE a.provider_id = $1 AND a.internment_id IS NULL';
        internmentQuery += ' WHERE i.notifying_provider_id = $1';
        queryParams.push(userId);
    } else {
        // Para auditores/admins, solo filtramos las autorizaciones sin internación
        authQuery += ' WHERE a.internment_id IS NULL';
    }
    
    authQuery += ' ORDER BY a.created_at DESC;';
    internmentQuery += ' ORDER BY i.created_at DESC;';

    const [authResult, internmentResult] = await Promise.all([
      pool.query(authQuery, queryParams),
      pool.query(internmentQuery, queryParams)
    ]);

    // Enriquecer internaciones con deadline
    const enrichedInternments = await Promise.all(
        internmentResult.rows.map(async (internment) => {
            if (internment.status === 'INICIADA') {
                const deadline = await calculateBusinessDeadline(internment.created_at, 48);
                return { ...internment, deadline: deadline.toISOString() };
            }
            return internment;
        })
    );

    const combinedResults = [...authResult.rows, ...enrichedInternments];
    combinedResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error("Error al obtener datos para el dashboard:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
