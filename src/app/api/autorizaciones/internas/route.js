import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  console.log("[DEBUG-BACKEND] Petición recibida en /api/autorizaciones/internas");

  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    // Consulta 1: Obtener las autorizaciones de prácticas médicas
    const authQuery = `
      SELECT 
        a.id::TEXT, 
        to_char(a.created_at, 'DD/MM/YYYY') as date, 
        a.type, 
        a.title, 
        a.beneficiary_name as beneficiary, 
        a.status, 
        a.is_important as "isImportant", 
        p.razonsocial as provider_name,
        u.name as auditor_name,
        'practice' as "requestType"
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
      WHERE a.internment_id IS NULL;
    `;
    const authResult = await client.query(authQuery);

    // Consulta 2: Obtener las internaciones con estado 'INICIADA'
    const internmentQuery = `
      SELECT
        i.id::TEXT,
        to_char(i.created_at, 'DD/MM/YYYY') as date,
        'Internación' as type,
        'Denuncia de Internación' as title,
        i.beneficiary_name as beneficiary,
        'Nuevas Solicitudes' as status, -- Normalizamos el estado para que el Kanban lo entienda
        false as "isImportant",
        p.razonsocial as provider_name,
        NULL as auditor_name,
        'internment' as "requestType",
        i.beneficiary_cuil,
        i.notifying_provider_id
      FROM internments i
      LEFT JOIN prestadores p ON i.notifying_provider_id = p.id
      WHERE i.status = 'INICIADA';
    `;
    const internmentResult = await client.query(internmentQuery);

    const combinedResults = [...authResult.rows, ...internmentResult.rows];
    
    // Ordenar por fecha descendente (opcional pero recomendado)
    combinedResults.sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
    
    console.log(`[DEBUG-BACKEND] Devolviendo ${combinedResults.length} resultados combinados.`);
    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error("[DEBUG-BACKEND] Error en /api/autorizaciones/internas:", error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener autorizaciones combinadas.' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
} 