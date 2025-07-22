import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'auditor') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      // Filtramos por los estados que le interesan al auditor
      const relevantStatuses = ['En Auditoría', 'Nuevas Solicitudes', 'Pendiente de Auditoría'];
      const query = `
        SELECT 
            a.id, 
            to_char(a.created_at, 'DD/MM/YYYY') as date, 
            a.type, 
            a.title, 
            a.beneficiary_name as beneficiary, 
            a.status, 
            a.is_important as "isImportant", 
            a.details,
            p.razonsocial as provider_name,
            u.name as auditor_name
        FROM 
            authorizations a
        LEFT JOIN 
            prestadores p ON a.provider_id = p.id
        LEFT JOIN 
            users u ON a.auditor_id = u.id
        WHERE
            a.status = ANY($1::varchar[])
        ORDER BY 
            a.created_at DESC;
      `;
      
      const { rows } = await client.query(query, [relevantStatuses]);
      return NextResponse.json(rows);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching auditor authorizations:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 