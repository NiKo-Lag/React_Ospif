// src/app/api/internments/[id]/field-audits/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  // Asumimos que un 'admin' o un rol superior puede solicitar auditorías
  if (!session || !['admin', 'operator'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const { id: internmentId } = params;
  const requesterOperatorId = session.user.id;

  try {
    const { assignedAuditorId, requestReason } = await request.json();

    if (!assignedAuditorId) {
      return NextResponse.json({ message: 'Se debe especificar un auditor.' }, { status: 400 });
    }

    // 1. Verificar que la internación exista y esté en un estado válido (p. ej., 'Aprobada' o 'Activa')
    const internmentRes = await pool.query('SELECT status FROM internments WHERE id = $1', [internmentId]);
    if (internmentRes.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    
    const internmentStatus = internmentRes.rows[0].status;
    if (!['ACTIVA', 'APROBADA'].includes(internmentStatus)) {
        return NextResponse.json({ message: `No se puede auditar una internación en estado '${internmentStatus}'.` }, { status: 409 });
    }

    // 2. Crear la solicitud de auditoría en la base de datos
    const insertQuery = `
      INSERT INTO field_audits (internment_id, assigned_auditor_id, requester_operator_id, observations)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const result = await pool.query(insertQuery, [internmentId, assignedAuditorId, requesterOperatorId, requestReason]);
    const newAuditId = result.rows[0].id;

    // (Opcional) Aquí podríamos añadir una notificación para el auditor asignado.

    return NextResponse.json({ 
      message: 'Solicitud de auditoría de terreno creada con éxito.',
      auditId: newAuditId 
    }, { status: 201 });

  } catch (error) {
    console.error("Error al crear la solicitud de auditoría de terreno:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 