// src/app/api/field-audits/[audit_id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const { audit_id: auditId } = params;
  const currentAuditorId = session.user.id;

  try {
    const { visitDate, observations, checklistData } = await request.json();

    if (!visitDate || !observations) {
      return NextResponse.json({ message: 'La fecha de visita y las observaciones son obligatorias.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verificar que la auditoría exista, esté 'Pendiente' y asignada al auditor actual
      const auditRes = await client.query(
        'SELECT assigned_auditor_id, status FROM field_audits WHERE id = $1 FOR UPDATE',
        [auditId]
      );

      if (auditRes.rowCount === 0) {
        return NextResponse.json({ message: 'Auditoría no encontrada.' }, { status: 404 });
      }

      const { assigned_auditor_id, status } = auditRes.rows[0];

      if (assigned_auditor_id !== currentAuditorId) {
        return NextResponse.json({ message: 'No tiene permiso para modificar esta auditoría.' }, { status: 403 });
      }

      if (status !== 'Pendiente') {
        return NextResponse.json({ message: `La auditoría ya no está pendiente (estado actual: ${status}).` }, { status: 409 });
      }

      // 2. Actualizar la auditoría con la información y cambiar el estado
      const updateQuery = `
        UPDATE field_audits
        SET 
          visit_date = $1,
          observations = $2,
          checklist_data = $3,
          status = 'Completada',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id;
      `;
      await client.query(updateQuery, [visitDate, observations, JSON.stringify(checklistData), auditId]);
      
      await client.query('COMMIT');
      
      return NextResponse.json({ message: 'Auditoría de terreno completada con éxito.' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error; // Re-lanzar el error para que sea capturado por el catch exterior
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`Error al completar la auditoría de terreno ${auditId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 