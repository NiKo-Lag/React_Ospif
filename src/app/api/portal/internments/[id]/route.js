// src/app/api/portal/internments/[id]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    // 1. Obtener datos de la internación
    const internmentQuery = 'SELECT * FROM internments WHERE id = $1';
    const internmentResult = await pool.query(internmentQuery, [id]);

    if (internmentResult.rowCount === 0) {
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    
    const internment = { ...internmentResult.rows[0], id: String(internmentResult.rows[0].id) };

    // 2. Obtener las prácticas asociadas
    const practicesQuery = 'SELECT id, title, status, created_at FROM authorizations WHERE internment_id = $1 ORDER BY created_at DESC';
    const practicesResult = await pool.query(practicesQuery, [id]);
    
    // --- CÓDIGO CONFLICTIVO COMENTADO ---
    /*
    const auditsQuery = `
      SELECT fa.id, fa.status, fa.visit_date, fa.created_at, requester.name as requester_name, auditor.name as auditor_name
      FROM field_audits fa
      LEFT JOIN users requester ON fa.requester_operator_id = requester.id
      LEFT JOIN users auditor ON fa.assigned_auditor_id = auditor.id
      WHERE fa.internment_id = $1 
      ORDER BY fa.created_at DESC
    `;
    const auditsResult = await pool.query(auditsQuery, [id]);
    */

    // 4. Combinar la información
    const details = internment.details || {};
    details.practices = practicesResult.rows.map(p => ({ ...p, id: String(p.id) }));
    // details.field_audits = auditsResult.rows.map(a => ({ ...a, id: String(a.id) }));

    const responsePayload = {
      ...internment,
      details: details,
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error(`Error al obtener el detalle de la internación ${params.id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
