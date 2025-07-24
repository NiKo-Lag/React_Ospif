// src/app/api/internments/[id]/send-to-audit/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

/**
 * Crea una autorización para una internación y la envía a auditoría.
 * Cambia el estado de la internación a 'EN AUDITORIA'.
 */
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Acceso denegado. Se requiere rol de Administrador u Operador.' }, { status: 403 });
  }

  const { id: internmentId } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos de la internación y bloquear la fila para evitar concurrencia
    const internmentRes = await client.query('SELECT * FROM internments WHERE id = $1 FOR UPDATE', [internmentId]);
    if (internmentRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }

    const internment = internmentRes.rows[0];

    // 2. Validar que el estado de la internación sea 'INICIADA'
    if (internment.status !== 'INICIADA') {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: `La internación ya se encuentra en estado '${internment.status}'. No se puede enviar a auditoría.` }, { status: 409 });
    }
    
    // 3. Crear una nueva autorización basada en la internación
    const newAuthorizationId = Date.now();
    const authorizationTitle = `Auditoría de Internación #${internment.id}`;

    const initialEvent = {
        date: new Date().toISOString(),
        description: `Autorización de internación creada y enviada a auditoría por ${session.user.name}.`,
    };
    
    // El campo `details` para la autorización será un subconjunto de los detalles de la internación
    const authorizationDetails = {
      events: [initialEvent],
      beneficiaryData: {
        cuil: internment.beneficiary_cuil,
        nombre: internment.beneficiary_name
      },
      // Copiamos campos relevantes del detalle de la internación si existen
      clinicalSummary: internment.details?.clinical_summary || internment.clinical_summary,
      presumptiveDiagnosis: internment.details?.presumptive_diagnosis || internment.presumptive_diagnosis,
    };

    const insertAuthQuery = `
      INSERT INTO authorizations (id, type, title, beneficiary_name, status, is_important, details, provider_id, internment_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    
    const authValues = [
      newAuthorizationId,
      'Internación',
      authorizationTitle,
      internment.beneficiary_name,
      'En Auditoría',
      true, // Las auditorías de internación siempre son importantes
      JSON.stringify(authorizationDetails),
      internment.notifying_provider_id,
      internment.id
    ];

    await client.query(insertAuthQuery, authValues);
    
    // 4. Actualizar el estado de la internación a 'EN AUDITORIA'
    const updateInternmentQuery = 'UPDATE internments SET status = $1 WHERE id = $2';
    await client.query(updateInternmentQuery, ['EN AUDITORIA', internmentId]);

    // 5. (Opcional) Notificar al grupo de auditores.
    // Por ahora, el simple hecho de estar 'En Auditoría' es la notificación.
    // Se puede añadir una lógica de notificación más explícita si es necesario.

    await client.query('COMMIT');
    return NextResponse.json({ 
      message: 'La internación ha sido enviada a auditoría correctamente.',
      authorizationId: newAuthorizationId
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al enviar la internación a auditoría:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
} 