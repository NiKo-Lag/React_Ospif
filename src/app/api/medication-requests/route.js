// src/app/api/medication-requests/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  // Solo operadores y administradores pueden crear solicitudes de medicación
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const {
      medicationName,
      dosage,
      quantity,
      unit,
      beneficiaryName,
      beneficiaryCuil,
      diagnosis,
      requestingDoctor,
      urgencyLevel = 'Normal',
      specialObservations,
      attachments = []
    } = await request.json();

    // Validaciones básicas
    if (!medicationName || !dosage || !quantity || !unit || !beneficiaryName || !beneficiaryCuil || !diagnosis || !requestingDoctor) {
      return NextResponse.json({ message: 'Faltan campos requeridos.' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ message: 'La cantidad debe ser mayor a 0.' }, { status: 400 });
    }

    if (!['Normal', 'Urgente', 'Crítica'].includes(urgencyLevel)) {
      return NextResponse.json({ message: 'Nivel de urgencia inválido.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Insertar la solicitud de medicación
    const insertQuery = `
      INSERT INTO medication_requests (
        medication_name, dosage, quantity, unit, beneficiary_name, beneficiary_cuil,
        diagnosis, requesting_doctor, urgency_level, special_observations, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      medicationName,
      dosage,
      quantity,
      unit,
      beneficiaryName,
      beneficiaryCuil,
      diagnosis,
      requestingDoctor,
      urgencyLevel,
      specialObservations || null,
      session.user.id
    ];

    const result = await client.query(insertQuery, values);
    const newRequest = result.rows[0];

    // Procesar archivos adjuntos si los hay
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const attachmentQuery = `
          INSERT INTO medication_request_attachments (
            medication_request_id, file_path, original_filename, mime_type, file_size, uploaded_by
          )
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        
        await client.query(attachmentQuery, [
          newRequest.id,
          attachment.filePath,
          attachment.originalFilename,
          attachment.mimeType,
          attachment.fileSize,
          session.user.id
        ]);
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Solicitud de medicación creada con éxito.',
      request: { ...newRequest, id: String(newRequest.id) }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear solicitud de medicación:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  // Solo usuarios internos pueden ver las solicitudes
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

    // Consulta principal con JOIN para obtener información del creador
    const query = `
      SELECT 
        mr.id,
        mr.medication_name,
        mr.dosage,
        mr.quantity,
        mr.unit,
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
        (SELECT COUNT(*) FROM medication_quotations mq WHERE mq.medication_request_id = mr.id) as quotations_count,
        (SELECT COUNT(*) FROM medication_quotations mq WHERE mq.medication_request_id = mr.id AND mq.status = 'Cotizada') as completed_quotations_count
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

    const requests = result.rows.map(row => ({
      ...row,
      id: String(row.id),
      quotations_count: parseInt(row.quotations_count),
      completed_quotations_count: parseInt(row.completed_quotations_count)
    }));

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener solicitudes de medicación:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 