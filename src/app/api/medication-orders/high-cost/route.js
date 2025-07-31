import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'operador', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  try {
    const client = await pool.connect();

    console.log('[DEBUG] Consultando medicaciones de alto coste...');

    // Consulta de prueba para ver todas las órdenes
    const testQuery = `SELECT id, high_cost, status, beneficiary_name FROM medication_requests ORDER BY created_at DESC LIMIT 10`;
    const testResult = await client.query(testQuery);
    console.log('[DEBUG] Todas las órdenes (últimas 10):', testResult.rows);

    // Obtener todas las medicaciones de alto coste
    const query = `
      SELECT 
        mr.id,
        mr.beneficiary_name,
        mr.beneficiary_cuil,
        mr.diagnosis,
        mr.requesting_doctor,
        mr.urgency_level,
        mr.status,
        mr.created_at,
        mr.quotation_deadline,
        mr.sent_quotations_count,
        mr.responded_quotations_count,
        mr.quotation_status,
        mr.high_cost,
        u.name as created_by_name
      FROM medication_requests mr
      LEFT JOIN users u ON mr.created_by = u.id
      WHERE mr.high_cost = true
      ORDER BY mr.created_at DESC
    `;

    const result = await client.query(query);
    console.log('[DEBUG] Total de órdenes encontradas:', result.rows.length);
    console.log('[DEBUG] Órdenes de alto coste:', result.rows.map(r => ({ id: r.id, high_cost: r.high_cost, status: r.status })));
    
    const orders = result.rows.map(order => ({
      ...order,
      id: String(order.id)
    }));

    // Calcular estadísticas
    const now = new Date();
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'Pendiente de Cotización').length,
      inQuotation: orders.filter(o => o.status === 'En Cotización').length,
      completed: orders.filter(o => o.status === 'Autorizada' || o.status === 'Rechazada').length,
      expired: orders.filter(o => {
        if (!o.quotation_deadline) return false;
        const deadline = new Date(o.quotation_deadline);
        return now > deadline;
      }).length
    };

    client.release();

    return NextResponse.json({
      orders,
      stats
    });

  } catch (error) {
    console.error('Error fetching high cost medications:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 