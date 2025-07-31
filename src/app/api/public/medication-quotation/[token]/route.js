// src/app/api/public/medication-quotation/[token]/route.js
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ message: 'Token no proporcionado.' }, { status: 400 });
  }

  try {
    // Buscar la cotización por token y verificar que no haya expirado
    const quotationQuery = `
      SELECT 
        mq.id as quotation_id,
        mq.status as quotation_status,
        mq.token_expires_at,
        mq.unit_price,
        mq.total_price,
        mq.availability,
        mq.delivery_time,
        mq.commercial_conditions,
        mq.observations,
        mq.submitted_at,
        moi.id as item_id,
        moi.medication_name,
        moi.dosage,
        moi.quantity,
        moi.unit,
        moi.special_instructions,
        moi.priority,
        mo.id as order_id,
        mo.beneficiary_name,
        mo.beneficiary_cuil,
        mo.diagnosis,
        mo.requesting_doctor,
        mo.urgency_level,
        mo.special_observations,
        mo.created_at as order_created_at,
        p.id as pharmacy_id,
        p.name as pharmacy_name,
        p.contact_person
      FROM medication_quotations mq
      JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id
      JOIN medication_orders mo ON moi.medication_order_id = mo.id
      JOIN pharmacies p ON mq.pharmacy_id = p.id
      WHERE mq.token = $1 AND mq.token_expires_at > NOW()
    `;

    const quotationResult = await pool.query(quotationQuery, [token]);

    if (quotationResult.rowCount === 0) {
      return NextResponse.json({ message: 'Cotización no encontrada o token expirado.' }, { status: 404 });
    }

    const quotation = quotationResult.rows[0];

    // Si la cotización ya fue enviada, devolver los datos completos
    if (quotation.quotation_status === 'Cotizada') {
      return NextResponse.json({
        message: 'Cotización ya completada.',
        quotation: {
          id: String(quotation.quotation_id),
          status: quotation.quotation_status,
          unitPrice: quotation.unit_price,
          totalPrice: quotation.total_price,
          availability: quotation.availability,
          deliveryTime: quotation.delivery_time,
          commercialConditions: quotation.commercial_conditions,
          observations: quotation.observations,
          submittedAt: quotation.submitted_at
        },
        item: {
          id: String(quotation.item_id),
          medicationName: quotation.medication_name,
          dosage: quotation.dosage,
          quantity: quotation.quantity,
          unit: quotation.unit,
          specialInstructions: quotation.special_instructions,
          priority: quotation.priority
        },
        order: {
          id: String(quotation.order_id),
          beneficiaryName: quotation.beneficiary_name,
          beneficiaryCuil: quotation.beneficiary_cuil,
          diagnosis: quotation.diagnosis,
          requestingDoctor: quotation.requesting_doctor,
          urgencyLevel: quotation.urgency_level,
          specialObservations: quotation.special_observations,
          createdAt: quotation.order_created_at
        },
        pharmacy: {
          id: String(quotation.pharmacy_id),
          name: quotation.pharmacy_name,
          contactPerson: quotation.contact_person
        }
      });
    }

    // Si la cotización está pendiente, devolver solo los datos para completar
    return NextResponse.json({
      message: 'Cotización pendiente de completar.',
      quotation: {
        id: String(quotation.quotation_id),
        status: quotation.quotation_status,
        tokenExpiresAt: quotation.token_expires_at
      },
      item: {
        id: String(quotation.item_id),
        medicationName: quotation.medication_name,
        dosage: quotation.dosage,
        quantity: quotation.quantity,
        unit: quotation.unit,
        specialInstructions: quotation.special_instructions,
        priority: quotation.priority
      },
      order: {
        id: String(quotation.order_id),
        beneficiaryName: quotation.beneficiary_name,
        beneficiaryCuil: quotation.beneficiary_cuil,
        diagnosis: quotation.diagnosis,
        requestingDoctor: quotation.requesting_doctor,
        urgencyLevel: quotation.urgency_level,
        specialObservations: quotation.special_observations,
        createdAt: quotation.order_created_at
      },
      pharmacy: {
        id: String(quotation.pharmacy_id),
        name: quotation.pharmacy_name,
        contactPerson: quotation.contact_person
      }
    });

  } catch (error) {
    console.error('Error al obtener cotización:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ message: 'Token no proporcionado.' }, { status: 400 });
  }

  try {
    const {
      unitPrice,
      totalPrice,
      availability,
      deliveryTime,
      commercialConditions,
      observations
    } = await request.json();

    // Validaciones básicas
    if (!unitPrice || !totalPrice || !availability) {
      return NextResponse.json({ message: 'Faltan campos requeridos.' }, { status: 400 });
    }

    if (unitPrice <= 0 || totalPrice <= 0) {
      return NextResponse.json({ message: 'Los precios deben ser mayores a 0.' }, { status: 400 });
    }

    if (!['Inmediata', '24hs', '48hs', '1 semana', 'No disponible'].includes(availability)) {
      return NextResponse.json({ message: 'Disponibilidad inválida.' }, { status: 400 });
    }

    // Verificar que la cotización existe, no ha expirado y está pendiente
    const quotationQuery = `
      SELECT mq.id, mq.status, mq.token_expires_at, mq.medication_order_item_id, p.name as pharmacy_name
      FROM medication_quotations mq
      JOIN pharmacies p ON mq.pharmacy_id = p.id
      WHERE mq.token = $1 AND mq.token_expires_at > NOW() AND mq.status = 'Pendiente'
    `;

    const quotationResult = await pool.query(quotationQuery, [token]);

    if (quotationResult.rowCount === 0) {
      return NextResponse.json({ message: 'Cotización no encontrada, expirada o ya completada.' }, { status: 404 });
    }

    const quotation = quotationResult.rows[0];

    // Actualizar la cotización
    const updateQuery = `
      UPDATE medication_quotations 
      SET 
        unit_price = $1,
        total_price = $2,
        availability = $3,
        delivery_time = $4,
        commercial_conditions = $5,
        observations = $6,
        status = 'Cotizada',
        submitted_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;

    const updateResult = await pool.query(updateQuery, [
      unitPrice,
      totalPrice,
      availability,
      deliveryTime || null,
      commercialConditions || null,
      observations || null,
      quotation.id
    ]);

    const updatedQuotation = updateResult.rows[0];

    // Obtener información de la orden para notificación
    const orderQuery = `
      SELECT 
        mo.id as order_id,
        mo.beneficiary_name,
        u.name as created_by_name,
        u.email as created_by_email
      FROM medication_quotations mq
      JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id
      JOIN medication_orders mo ON moi.medication_order_id = mo.id
      JOIN users u ON mo.created_by = u.id
      WHERE mq.id = $1
    `;

    const orderResult = await pool.query(orderQuery, [quotation.id]);
    const orderInfo = orderResult.rows[0];

    // Enviar notificación al operador (opcional, no bloquear si falla)
    if (orderInfo.created_by_email) {
      const { sendMail } = await import('@/lib/email');
      
      sendMail({
        to: orderInfo.created_by_email,
        subject: `[OSPIF] Cotización Recibida - Orden #${orderInfo.order_id}`,
        text: `
Hola ${orderInfo.created_by_name},

Se ha recibido una nueva cotización para la orden #${orderInfo.order_id} del beneficiario ${orderInfo.beneficiary_name}.

Droguería: ${quotation.pharmacy_name}
Precio Total: $${totalPrice}
Disponibilidad: ${availability}

Puede revisar todas las cotizaciones en el sistema.

Gracias,
Equipo OSPIF
        `,
        html: `
          <p>Hola <strong>${orderInfo.created_by_name}</strong>,</p>
          
          <p>Se ha recibido una nueva cotización para la orden <strong>#${orderInfo.order_id}</strong> del beneficiario <strong>${orderInfo.beneficiary_name}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Droguería:</strong> ${quotation.pharmacy_name}</p>
            <p><strong>Precio Total:</strong> $${totalPrice}</p>
            <p><strong>Disponibilidad:</strong> ${availability}</p>
          </div>
          
          <p>Puede revisar todas las cotizaciones en el sistema.</p>
          
          <p>Gracias,<br/>Equipo OSPIF</p>
        `
      }).catch(error => {
        console.error('Error enviando notificación de cotización:', error);
      });
    }

    return NextResponse.json({
      message: 'Cotización enviada exitosamente.',
      quotation: {
        id: String(updatedQuotation.id),
        status: updatedQuotation.status,
        unitPrice: updatedQuotation.unit_price,
        totalPrice: updatedQuotation.total_price,
        availability: updatedQuotation.availability,
        deliveryTime: updatedQuotation.delivery_time,
        commercialConditions: updatedQuotation.commercial_conditions,
        observations: updatedQuotation.observations,
        submittedAt: updatedQuotation.submitted_at
      }
    });

  } catch (error) {
    console.error('Error al enviar cotización:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 