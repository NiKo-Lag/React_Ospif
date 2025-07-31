// src/app/api/medication-orders/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  // Solo operadores y administradores pueden crear órdenes de medicación
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    console.log('[DEBUG] Iniciando creación de orden de medicación');
    console.log('[DEBUG] Session user:', session.user);
    const {
      beneficiaryName,
      beneficiaryCuil,
      diagnosis,
      requestingDoctor,
      urgencyLevel = 'Normal',
      specialObservations,
      highCost = false, // Nuevo campo para determinar si es alto coste
      quotationDeadlineHours = 48, // Tiempo configurable para cotización
      items = [], // Array de items de medicación
      attachments = []
    } = await request.json();

    console.log('[DEBUG] Datos recibidos:', {
      beneficiaryName,
      beneficiaryCuil,
      diagnosis,
      requestingDoctor,
      urgencyLevel,
      highCost,
      quotationDeadlineHours,
      itemsCount: items.length
    });

    // Validaciones básicas
    if (!beneficiaryName || !beneficiaryCuil || !diagnosis || !requestingDoctor) {
      return NextResponse.json({ message: 'Faltan campos requeridos de la orden.' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'La orden debe contener al menos un medicamento.' }, { status: 400 });
    }

    if (!['Normal', 'Urgente', 'Crítica'].includes(urgencyLevel)) {
      return NextResponse.json({ message: 'Nivel de urgencia inválido.' }, { status: 400 });
    }

    // Determinar automáticamente si es alto coste basado en los medicamentos
    let isHighCost = highCost; // Usar el valor proporcionado o determinar automáticamente
    
    if (!highCost) {
      // Lista de medicamentos de alto coste (se puede expandir)
      const highCostMedications = [
        'insulina', 'quimioterapia', 'anticuerpos', 'factor viii', 'factor ix',
        'inmunoglobulina', 'rituximab', 'trastuzumab', 'bevacizumab',
        'adalimumab', 'etanercept', 'infliximab', 'ustekinumab'
      ];
      
      // Verificar si algún medicamento está en la lista de alto coste
      for (const item of items) {
        const medicationName = item.medicationName.toLowerCase();
        if (highCostMedications.some(hc => medicationName.includes(hc))) {
          isHighCost = true;
          break;
        }
      }
    }

    // Validar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicationName || !item.dosage || !item.quantity || !item.unit) {
        return NextResponse.json({ message: `Item ${i + 1}: Faltan campos requeridos del medicamento.` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ message: `Item ${i + 1}: La cantidad debe ser mayor a 0.` }, { status: 400 });
      }
      if (item.priority && item.priority <= 0) {
        return NextResponse.json({ message: `Item ${i + 1}: La prioridad debe ser mayor a 0.` }, { status: 400 });
      }
    }

    await client.query('BEGIN');

    // Crear una solicitud por cada item de medicación
    const createdRequests = [];
    
    for (const item of items) {
      // 1. Insertar la solicitud de medicación
      const insertRequestQuery = `
        INSERT INTO medication_requests (
          medication_name, dosage, quantity, unit,
          beneficiary_name, beneficiary_cuil, diagnosis, requesting_doctor,
          urgency_level, special_observations, created_by, status, quotation_deadline_hours, high_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;

      // Determinar estado inicial según tipo de medicación
      let initialStatus = 'Creada'; // Estado inicial para todas las medicaciones

      const requestValues = [
        item.medicationName,
        item.dosage,
        item.quantity,
        item.unit,
        beneficiaryName,
        beneficiaryCuil,
        diagnosis,
        requestingDoctor,
        urgencyLevel,
        specialObservations || null,
        session.user.id,
        initialStatus,
        quotationDeadlineHours,
        isHighCost
      ];

      console.log('[DEBUG] Ejecutando inserción de solicitud con valores:', requestValues);
      console.log('[DEBUG] isHighCost:', isHighCost);
      console.log('[DEBUG] highCost recibido:', highCost);
      const requestResult = await client.query(insertRequestQuery, requestValues);
      const newRequest = requestResult.rows[0];
      console.log('[DEBUG] Solicitud creada:', newRequest);
      console.log('[DEBUG] high_cost guardado:', newRequest.high_cost);
      
      createdRequests.push(newRequest);
    }

    // 3. Procesar archivos adjuntos si los hay (temporalmente deshabilitado)
    if (attachments && attachments.length > 0) {
      console.log('[DEBUG] Archivos adjuntos detectados:', attachments.length);
      // TODO: Implementar procesamiento de archivos adjuntos
      console.log('[DEBUG] Procesamiento de archivos adjuntos deshabilitado temporalmente');
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Orden de medicación creada con éxito.',
      orders: createdRequests.map(req => ({ 
        ...req, 
        id: String(req.id),
        isHighCost: isHighCost,
        requiresQuotation: isHighCost,
        requiresAudit: isHighCost
      }))
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DEBUG] Error al crear orden de medicación:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    return NextResponse.json({ 
      message: 'Error interno del servidor.',
      details: error.message 
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  // Solo usuarios internos pueden ver las órdenes
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;

  try {
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    // Filtro por estado si se especifica
    if (status) {
      paramCount++;
      whereClause = `WHERE mr.status = $${paramCount}`;
      queryParams.push(status);
    }

    // Consulta principal con JOIN para obtener información del creador y resumen de cotizaciones
    const query = `
      SELECT 
        mr.id,
        mr.beneficiary_name,
        mr.beneficiary_cuil,
        mr.diagnosis,
        mr.requesting_doctor,
        mr.urgency_level,
        mr.special_observations,
        mr.status,
        mr.created_at,
        mr.sent_to_quotation_at,
        mr.authorized_at,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM medication_order_items moi WHERE moi.medication_request_id = mr.id) as items_count,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         WHERE moi.medication_request_id = mr.id) as total_quotations_count,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         WHERE moi.medication_request_id = mr.id AND mq.status = 'Cotizada') as completed_quotations_count
      FROM medication_requests mr
      LEFT JOIN users u ON mr.created_by = u.id
      ${whereClause}
      ORDER BY mr.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2};
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    // Consulta para el total de registros (para paginación)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM medication_requests mr
      ${whereClause};
    `;
    
    const countResult = await pool.query(countQuery, status ? [status] : []);
    const total = parseInt(countResult.rows[0].total);

    const orders = result.rows.map(row => ({
      ...row,
      id: String(row.id),
      items_count: parseInt(row.items_count),
      total_quotations_count: parseInt(row.total_quotations_count),
      completed_quotations_count: parseInt(row.completed_quotations_count)
    }));

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener órdenes de medicación:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 