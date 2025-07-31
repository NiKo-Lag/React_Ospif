// src/app/api/medication-orders/[id]/quotations/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'operador', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    const client = await pool.connect();

    // Obtener detalles de la orden
    const orderQuery = `
      SELECT 
        mr.*,
        u.name as created_by_name
      FROM medication_requests mr
      LEFT JOIN users u ON mr.created_by = u.id
      WHERE mr.id = $1
    `;

    const orderResult = await client.query(orderQuery, [id]);
    
    if (orderResult.rows.length === 0) {
      return NextResponse.json({ message: 'Orden no encontrada.' }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // En la nueva estructura, cada medicación es una solicitud separada
    // No hay items separados, la información está directamente en medication_requests
    const items = [{
      id: order.id,
      medication_name: order.medication_name,
      dosage: order.dosage,
      quantity: order.quantity,
      unit: order.unit,
      special_instructions: order.special_observations,
      priority: 1
    }];

    // Obtener cotizaciones directamente para esta solicitud
    const quotationsQuery = `
      SELECT 
        mq.*,
        p.name as pharmacy_name,
        p.email as pharmacy_email,
        p.contact_person as pharmacy_contact
      FROM medication_quotations mq
      JOIN pharmacies p ON mq.pharmacy_id = p.id
      WHERE mq.medication_request_id = $1
      ORDER BY mq.created_at DESC
    `;

    const quotationsResult = await client.query(quotationsQuery, [id]);
    const quotations = quotationsResult.rows;

    // Agrupar cotizaciones por item (en este caso solo hay uno)
    const quotationsByItem = {
      [order.id]: quotations
    };

    // Calcular estadísticas
    const totalQuotations = quotations.length;
    const completedQuotations = quotations.filter(q => q.status === 'Cotizada').length;
    const completionRate = totalQuotations > 0 ? (completedQuotations / totalQuotations) * 100 : 0;

    // Verificar si es alto coste y estado de cotización
    const isHighCost = order.high_cost;
    const quotationStatus = order.quotation_status;
    const quotationDeadline = order.quotation_deadline;

    // Calcular tiempo restante si hay deadline
    let timeRemaining = null;
    let isExpired = false;
    if (quotationDeadline) {
      const now = new Date();
      const deadline = new Date(quotationDeadline);
      timeRemaining = Math.max(0, deadline - now);
      isExpired = now > deadline;
    }

    client.release();

    return NextResponse.json({
      order: {
        ...order,
        id: String(order.id),
        isHighCost,
        quotationStatus,
        quotationDeadline,
        timeRemaining,
        isExpired
      },
      items: items.map(item => ({ ...item, id: String(item.id) })),
      quotationsByItem,
      statistics: {
        totalQuotations,
        completedQuotations,
        completionRate,
        pendingQuotations: totalQuotations - completedQuotations
      }
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 