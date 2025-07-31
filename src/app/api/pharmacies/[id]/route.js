// src/app/api/pharmacies/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { id: pharmacyId } = params;

  if (!pharmacyId) {
    return NextResponse.json({ message: 'ID de droguería no proporcionado.' }, { status: 400 });
  }

  try {
    // Obtener información detallada de la droguería
    const pharmacyQuery = `
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
         WHERE ph.id = p.id AND mq.status = 'Autorizada') as authorized_quotations,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         JOIN pharmacies ph ON mq.pharmacy_id = ph.id 
         WHERE ph.id = p.id AND mq.status = 'Pendiente') as pending_quotations,
        (SELECT COUNT(*) FROM medication_quotations mq 
         JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id 
         JOIN pharmacies ph ON mq.pharmacy_id = ph.id 
         WHERE ph.id = p.id AND mq.status = 'Rechazada') as rejected_quotations
      FROM pharmacies p
      WHERE p.id = $1
    `;

    const result = await pool.query(pharmacyQuery, [pharmacyId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Droguería no encontrada.' }, { status: 404 });
    }

    const pharmacy = result.rows[0];

    // Obtener historial de cotizaciones recientes
    const recentQuotationsQuery = `
      SELECT 
        mq.id,
        mq.status,
        mq.total_price,
        mq.availability,
        mq.submitted_at,
        moi.medication_name,
        moi.dosage,
        moi.quantity,
        moi.unit,
        mo.id as order_id,
        mo.beneficiary_name,
        mo.created_at as order_created_at
      FROM medication_quotations mq
      JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id
      JOIN medication_orders mo ON moi.medication_order_id = mo.id
      WHERE mq.pharmacy_id = $1
      ORDER BY mq.submitted_at DESC NULLS LAST, mq.created_at DESC
      LIMIT 10
    `;

    const quotationsResult = await pool.query(recentQuotationsQuery, [pharmacyId]);
    const recentQuotations = quotationsResult.rows.map(quotation => ({
      ...quotation,
      id: String(quotation.id),
      order_id: String(quotation.order_id)
    }));

    // Calcular estadísticas
    const totalQuotations = parseInt(pharmacy.total_quotations);
    const authorizedQuotations = parseInt(pharmacy.authorized_quotations);
    const pendingQuotations = parseInt(pharmacy.pending_quotations);
    const rejectedQuotations = parseInt(pharmacy.rejected_quotations);

    const successRate = totalQuotations > 0 ? Math.round((authorizedQuotations / totalQuotations) * 100) : 0;

    return NextResponse.json({
      pharmacy: {
        ...pharmacy,
        id: String(pharmacy.id),
        total_quotations: totalQuotations,
        authorized_quotations: authorizedQuotations,
        pending_quotations: pendingQuotations,
        rejected_quotations: rejectedQuotations,
        success_rate: successRate
      },
      recentQuotations,
      statistics: {
        totalQuotations,
        authorizedQuotations,
        pendingQuotations,
        rejectedQuotations,
        successRate,
        averageResponseTime: null // TODO: Implementar cálculo de tiempo promedio de respuesta
      }
    });

  } catch (error) {
    console.error('Error al obtener droguería:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado. Solo administradores y operadores pueden modificar droguerías.' }, { status: 403 });
  }

  const { id: pharmacyId } = params;

  if (!pharmacyId) {
    return NextResponse.json({ message: 'ID de droguería no proporcionado.' }, { status: 400 });
  }

  try {
    const {
      name,
      email,
      phone,
      address,
      contactPerson,
      isActive
    } = await request.json();

    // Verificar que la droguería existe
    const existingQuery = 'SELECT id, email FROM pharmacies WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [pharmacyId]);

    if (existingResult.rowCount === 0) {
      return NextResponse.json({ message: 'Droguería no encontrada.' }, { status: 404 });
    }

    const existingPharmacy = existingResult.rows[0];

    // Validaciones básicas
    if (!name || !email || !contactPerson) {
      return NextResponse.json({ message: 'Nombre, email y persona de contacto son campos requeridos.' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Formato de email inválido.' }, { status: 400 });
    }

    // Verificar que el email no esté duplicado (excluyendo la droguería actual)
    if (email !== existingPharmacy.email) {
      const duplicateQuery = 'SELECT id FROM pharmacies WHERE email = $1 AND id != $2';
      const duplicateResult = await pool.query(duplicateQuery, [email, pharmacyId]);

      if (duplicateResult.rowCount > 0) {
        return NextResponse.json({ message: 'Ya existe otra droguería con este email.' }, { status: 409 });
      }
    }

    // Actualizar la droguería
    const updateQuery = `
      UPDATE pharmacies 
      SET 
        name = $1,
        email = $2,
        phone = $3,
        address = $4,
        contact_person = $5,
        is_active = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      name,
      email,
      phone || null,
      address || null,
      contactPerson,
      isActive,
      pharmacyId
    ]);

    const updatedPharmacy = result.rows[0];

    return NextResponse.json({
      message: 'Droguería actualizada exitosamente.',
      pharmacy: {
        ...updatedPharmacy,
        id: String(updatedPharmacy.id)
      }
    });

  } catch (error) {
    console.error('Error al actualizar droguería:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado. Solo administradores pueden eliminar droguerías.' }, { status: 403 });
  }

  const { id: pharmacyId } = params;

  if (!pharmacyId) {
    return NextResponse.json({ message: 'ID de droguería no proporcionado.' }, { status: 400 });
  }

  try {
    // Verificar que la droguería existe
    const existingQuery = 'SELECT id, name FROM pharmacies WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [pharmacyId]);

    if (existingResult.rowCount === 0) {
      return NextResponse.json({ message: 'Droguería no encontrada.' }, { status: 404 });
    }

    const pharmacy = existingResult.rows[0];

    // Verificar si tiene cotizaciones activas
    const activeQuotationsQuery = `
      SELECT COUNT(*) as count
      FROM medication_quotations mq
      WHERE mq.pharmacy_id = $1 AND mq.status IN ('Pendiente', 'Cotizada')
    `;

    const activeQuotationsResult = await pool.query(activeQuotationsQuery, [pharmacyId]);
    const activeQuotationsCount = parseInt(activeQuotationsResult.rows[0].count);

    if (activeQuotationsCount > 0) {
      return NextResponse.json({ 
        message: `No se puede eliminar la droguería. Tiene ${activeQuotationsCount} cotización(es) activa(s).` 
      }, { status: 400 });
    }

    // Realizar soft delete (marcar como inactiva en lugar de eliminar)
    const softDeleteQuery = `
      UPDATE pharmacies 
      SET 
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(softDeleteQuery, [pharmacyId]);
    const deletedPharmacy = result.rows[0];

    return NextResponse.json({
      message: 'Droguería desactivada exitosamente.',
      pharmacy: {
        ...deletedPharmacy,
        id: String(deletedPharmacy.id)
      }
    });

  } catch (error) {
    console.error('Error al eliminar droguería:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 