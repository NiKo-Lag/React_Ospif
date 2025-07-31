// src/app/api/medication-orders/[id]/send-to-quotation/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { calculateBusinessDeadline } from '@/lib/date-utils';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { id } = params;
  const { pharmacyIds } = await request.json();

  if (!pharmacyIds || pharmacyIds.length < 3) {
    return NextResponse.json({ 
      message: 'Se requieren al menos 3 farmacias para cotización de alto coste.' 
    }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // 1. Verificar que la orden existe y es de alto coste
    const orderQuery = `
      SELECT * FROM medication_requests 
      WHERE id = $1 AND high_cost = true
    `;
    const orderResult = await client.query(orderQuery, [id]);
    
    if (orderResult.rows.length === 0) {
      return NextResponse.json({ 
        message: 'Orden no encontrada o no es de alto coste.' 
      }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // 2. Verificar que no se haya enviado ya a cotización
    if (order.quotation_status !== 'pending') {
      return NextResponse.json({ 
        message: 'La orden ya ha sido enviada a cotización.' 
      }, { status: 400 });
    }

    await client.query('BEGIN');

    // 3. Calcular fecha límite usando el tiempo configurable
    const deadlineHours = order.quotation_deadline_hours || 48;
    const deadline = await calculateBusinessDeadline(new Date(), deadlineHours);

    console.log(`[DEBUG] Calculando fecha límite: ${deadlineHours} horas hábiles desde ${new Date()} hasta ${deadline}`);

    // 4. Actualizar estado de la orden
    await client.query(`
      UPDATE medication_requests 
      SET 
        quotation_status = 'sent',
        quotation_deadline = $1,
        sent_quotations_count = $2,
        minimum_quotations = $3,
        status = 'En Cotización'
      WHERE id = $4
    `, [deadline, pharmacyIds.length, 3, id]);

    // 5. Crear cotizaciones para cada farmacia
    const quotationPromises = pharmacyIds.map(async (pharmacyId) => {
      // Generar token único para cada cotización
      const token = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const quotationQuery = `
        INSERT INTO medication_quotations (
          medication_request_id, pharmacy_id, token, status, 
          token_expires_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

      // Crear cotización para la solicitud
      await client.query(quotationQuery, [
        id,
        pharmacyId,
        token,
        'Pendiente',
        deadline
      ]);
    });

    await Promise.all(quotationPromises);

    // 6. Enviar notificaciones por email (simulado)
    console.log(`[DEBUG] Enviando ${pharmacyIds.length} notificaciones de cotización`);

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Orden enviada a cotización exitosamente.',
      orderId: id,
      pharmaciesCount: pharmacyIds.length,
      deadline: deadline.toISOString(),
      status: 'En Cotización'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al enviar orden a cotización:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
}

// API para verificar estado de cotizaciones
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'operador', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    const client = await pool.connect();

    // Obtener información de la orden y sus cotizaciones
    const query = `
      SELECT 
        mr.*,
        COUNT(mq.id) as total_quotations,
        COUNT(CASE WHEN mq.status = 'Cotizada' THEN 1 END) as responded_quotations,
        COUNT(CASE WHEN mq.status = 'Pendiente' THEN 1 END) as pending_quotations
      FROM medication_requests mr
      LEFT JOIN medication_quotations mq ON mr.id = mq.medication_request_id
      WHERE mr.id = $1
      GROUP BY mr.id
    `;

    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Orden no encontrada.' }, { status: 404 });
    }

    const order = result.rows[0];
    const now = new Date();
    const deadline = order.quotation_deadline ? new Date(order.quotation_deadline) : null;
    const isExpired = deadline && now > deadline;

    // Calcular tiempo restante en horas hábiles
    let timeRemainingHours = null;
    if (deadline && !isExpired) {
      const timeRemainingMs = deadline.getTime() - now.getTime();
      timeRemainingHours = Math.ceil(timeRemainingMs / (1000 * 60 * 60)); // Convertir a horas
    }

    return NextResponse.json({
      order: {
        ...order,
        id: String(order.id),
        isExpired,
        timeRemainingHours,
        deadline: deadline ? deadline.toISOString() : null
      }
    });

  } catch (error) {
    console.error('Error al obtener estado de cotizaciones:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 