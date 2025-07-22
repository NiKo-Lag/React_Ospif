// src/app/api/portal/internments-panel/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { calculateBusinessDeadline } from '@/lib/date-utils';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Obtiene todas las internaciones asociadas al prestador que ha iniciado sesión.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const providerId = session.user.id;
    
    const query = `
      SELECT 
        i.id,
        i.beneficiary_name,
        i.beneficiary_cuil,
        i.admission_datetime,
        i.status,
        i.character as "type",
        i.admission_reason as "reason",
        i.egreso_date,
        p.razonsocial as "provider_name"
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id
      WHERE i.notifying_provider_id = $1
      ORDER BY i.admission_datetime DESC;
    `;

    const result = await pool.query(query, [providerId]);

    // Enriquecer los datos con la fecha límite para las internaciones 'INICIADA'
    const internmentsWithDeadline = await Promise.all(
        result.rows.map(async (internment) => {
            if (internment.status === 'INICIADA') {
                const deadline = await calculateBusinessDeadline(internment.admission_datetime, 48);
                return { ...internment, deadline: deadline.toISOString() };
            }
            return internment;
        })
    );

    return NextResponse.json(internmentsWithDeadline);

  } catch (error) {
    console.error("Error al obtener las internaciones del prestador:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
