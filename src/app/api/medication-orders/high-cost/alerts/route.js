import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'operador', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  try {
    const client = await pool.connect();

    // Obtener medicaciones de alto coste que requieren atención
    const query = `
      SELECT 
        mr.id,
        mr.beneficiary_name,
        mr.status,
        mr.quotation_deadline,
        mr.sent_quotations_count,
        mr.responded_quotations_count,
        mr.created_at
      FROM medication_requests mr
      WHERE mr.high_cost = true 
        AND mr.status IN ('En Cotización', 'Pendiente de Cotización')
        AND mr.quotation_deadline IS NOT NULL
      ORDER BY mr.quotation_deadline ASC
    `;

    const result = await client.query(query);
    const orders = result.rows;

    const now = new Date();
    const alerts = [];

    orders.forEach((order) => {
      const deadline = new Date(order.quotation_deadline);
      const timeRemaining = deadline - now;
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

      // Alerta si ha expirado
      if (timeRemaining <= 0) {
        alerts.push({
          id: `expired_${order.id}`,
          type: 'expired',
          orderId: order.id,
          beneficiaryName: order.beneficiary_name,
          respondedCount: order.responded_quotations_count || 0,
          totalCount: order.sent_quotations_count || 0,
          timeRemaining: 'Expirado',
          priority: 'high'
        });
      }
      // Alerta si expira en las próximas 4 horas
      else if (hoursRemaining <= 4 && hoursRemaining > 0) {
        alerts.push({
          id: `expiring_${order.id}`,
          type: 'expiring_soon',
          orderId: order.id,
          beneficiaryName: order.beneficiary_name,
          respondedCount: order.responded_quotations_count || 0,
          totalCount: order.sent_quotations_count || 0,
          timeRemaining: `${hoursRemaining}h`,
          priority: 'medium'
        });
      }
      // Alerta si no hay cotizaciones respondidas y han pasado más de 24 horas
      else if (order.responded_quotations_count === 0 && timeRemaining > 24 * 60 * 60 * 1000) {
        alerts.push({
          id: `no_response_${order.id}`,
          type: 'no_response',
          orderId: order.id,
          beneficiaryName: order.beneficiary_name,
          respondedCount: 0,
          totalCount: order.sent_quotations_count || 0,
          timeRemaining: `${hoursRemaining}h`,
          priority: 'low'
        });
      }
    });

    // Ordenar por prioridad: expiradas primero, luego por tiempo restante
    alerts.sort((a, b) => {
      if (a.type === 'expired' && b.type !== 'expired') return -1;
      if (b.type === 'expired' && a.type !== 'expired') return 1;
      return a.priority.localeCompare(b.priority);
    });

    client.release();

    return NextResponse.json({
      alerts: alerts.slice(0, 10) // Limitar a 10 alertas más importantes
    });

  } catch (error) {
    console.error('Error fetching high cost alerts:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 