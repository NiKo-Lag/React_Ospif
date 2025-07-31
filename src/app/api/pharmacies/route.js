// src/app/api/pharmacies/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    // Construir la consulta con filtros
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (isActive !== null) {
      paramCount++;
      whereClause += `WHERE p.is_active = $${paramCount}`;
      queryParams.push(isActive === 'true');
    }

    if (search) {
      paramCount++;
      const searchCondition = `WHERE p.name ILIKE $${paramCount} OR p.contact_person ILIKE $${paramCount} OR p.email ILIKE $${paramCount}`;
      whereClause = whereClause ? whereClause.replace('WHERE', 'AND') : searchCondition;
      queryParams.push(`%${search}%`);
    }

    // Consulta principal
    const query = `
      SELECT 
        p.id,
        p.name,
        p.email,
        p.phone,
        p.address,
        p.contact_person,
        p.is_active,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         JOIN pharmacies ph ON mq.pharmacy_id = ph.id 
         WHERE ph.id = p.id) as total_quotations,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         JOIN pharmacies ph ON mq.pharmacy_id = ph.id 
         WHERE ph.id = p.id AND mq.status = 'Autorizada') as authorized_quotations
      FROM pharmacies p
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Consulta para el total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pharmacies p
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Procesar resultados
    const pharmacies = result.rows.map(pharmacy => ({
      ...pharmacy,
      id: String(pharmacy.id),
      total_quotations: parseInt(pharmacy.total_quotations),
      authorized_quotations: parseInt(pharmacy.authorized_quotations),
      success_rate: pharmacy.total_quotations > 0 
        ? Math.round((pharmacy.authorized_quotations / pharmacy.total_quotations) * 100) 
        : 0
    }));

    return NextResponse.json({
      pharmacies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener droguerías:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado. Solo administradores y operadores pueden crear droguerías.' }, { status: 403 });
  }

  try {
    const {
      name,
      email,
      phone,
      address,
      contactPerson,
      isActive = true
    } = await request.json();

    // Validaciones básicas
    if (!name || !email || !contactPerson) {
      return NextResponse.json({ message: 'Nombre, email y persona de contacto son campos requeridos.' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Formato de email inválido.' }, { status: 400 });
    }

    // Verificar que el email no esté duplicado
    const existingPharmacyQuery = 'SELECT id FROM pharmacies WHERE email = $1';
    const existingResult = await pool.query(existingPharmacyQuery, [email]);

    if (existingResult.rowCount > 0) {
      return NextResponse.json({ message: 'Ya existe una droguería con este email.' }, { status: 409 });
    }

    // Insertar nueva droguería
    const insertQuery = `
      INSERT INTO pharmacies (
        name, email, phone, address, contact_person, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      name,
      email,
      phone || null,
      address || null,
      contactPerson,
      isActive
    ]);

    const newPharmacy = result.rows[0];

    return NextResponse.json({
      message: 'Droguería creada exitosamente.',
      pharmacy: {
        ...newPharmacy,
        id: String(newPharmacy.id),
        total_quotations: 0,
        authorized_quotations: 0,
        success_rate: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear droguería:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 