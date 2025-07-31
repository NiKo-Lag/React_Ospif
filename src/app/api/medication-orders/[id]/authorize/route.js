// src/app/api/medication-orders/[id]/authorize/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { sendMail } from '@/lib/email';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado. Solo auditores médicos pueden autorizar cotizaciones.' }, { status: 403 });
  }

  const { id: orderId } = params;

  if (!orderId) {
    return NextResponse.json({ message: 'ID de orden no proporcionado.' }, { status: 400 });
  }

  try {
    const {
      authorizedQuotationId,
      authorizationNotes,
      authorizationType = 'full' // 'full' o 'partial'
    } = await request.json();

    if (!authorizedQuotationId) {
      return NextResponse.json({ message: 'ID de cotización autorizada es requerido.' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verificar que la orden existe y está en estado válido para autorización
      const orderQuery = `
        SELECT 
          mo.id, mo.beneficiary_name, mo.beneficiary_cuil, mo.diagnosis, 
          mo.requesting_doctor, mo.urgency_level, mo.status, mo.created_by,
          u.name as created_by_name, u.email as created_by_email
        FROM medication_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        WHERE mo.id = $1 AND mo.status IN ('En Cotización', 'Pendiente de Autorización')
      `;

      const orderResult = await client.query(orderQuery, [orderId]);

      if (orderResult.rowCount === 0) {
        return NextResponse.json({ message: 'Orden no encontrada o no está en estado válido para autorización.' }, { status: 404 });
      }

      const order = orderResult.rows[0];

      // 2. Verificar que la cotización existe y pertenece a esta orden
      const quotationQuery = `
        SELECT 
          mq.id, mq.status, mq.total_price, mq.availability, mq.delivery_time,
          mq.commercial_conditions, mq.observations, mq.submitted_at,
          moi.id as item_id, moi.medication_name, moi.dosage, moi.quantity, moi.unit,
          p.id as pharmacy_id, p.name as pharmacy_name, p.email as pharmacy_email,
          p.contact_person
        FROM medication_quotations mq
        JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id
        JOIN pharmacies p ON mq.pharmacy_id = p.id
        WHERE mq.id = $1 AND moi.medication_order_id = $2 AND mq.status = 'Cotizada'
      `;

      const quotationResult = await client.query(quotationQuery, [authorizedQuotationId, orderId]);

      if (quotationResult.rowCount === 0) {
        return NextResponse.json({ message: 'Cotización no encontrada, no pertenece a esta orden o no está completada.' }, { status: 404 });
      }

      const authorizedQuotation = quotationResult.rows[0];

      // 3. Obtener todas las cotizaciones de la orden para verificar completitud
      const allQuotationsQuery = `
        SELECT 
          mq.id, mq.status, mq.medication_order_item_id,
          moi.medication_name, moi.dosage, moi.quantity, moi.unit
        FROM medication_quotations mq
        JOIN medication_order_items moi ON mq.medication_order_item_id = moi.id
        WHERE moi.medication_order_id = $1
      `;

      const allQuotationsResult = await client.query(allQuotationsQuery, [orderId]);
      const allQuotations = allQuotationsResult.rows;

      // 4. Verificar que todas las cotizaciones están completadas
      const pendingQuotations = allQuotations.filter(q => q.status !== 'Cotizada');
      
      if (pendingQuotations.length > 0) {
        const pendingItems = pendingQuotations.map(q => `${q.medication_name} ${q.dosage}`).join(', ');
        return NextResponse.json({ 
          message: `No se puede autorizar la orden. Faltan cotizaciones pendientes para: ${pendingItems}` 
        }, { status: 400 });
      }

      // 5. Actualizar la orden con la autorización
      const updateOrderQuery = `
        UPDATE medication_orders 
        SET 
          status = 'Autorizada',
          authorized_at = NOW(),
          authorized_by = $1,
          details = COALESCE(details, '{}'::jsonb) || $2::jsonb
        WHERE id = $3
        RETURNING *;
      `;

      const authorizationDetails = {
        authorizedQuotationId: String(authorizedQuotationId),
        authorizedBy: session.user.id,
        authorizedAt: new Date().toISOString(),
        authorizationNotes: authorizationNotes || null,
        authorizationType,
        authorizedPharmacy: {
          id: String(authorizedQuotation.pharmacy_id),
          name: authorizedQuotation.pharmacy_name,
          contactPerson: authorizedQuotation.contact_person
        },
        authorizedItem: {
          id: String(authorizedQuotation.item_id),
          medicationName: authorizedQuotation.medication_name,
          dosage: authorizedQuotation.dosage,
          quantity: authorizedQuotation.quantity,
          unit: authorizedQuotation.unit
        },
        quotationDetails: {
          totalPrice: authorizedQuotation.total_price,
          availability: authorizedQuotation.availability,
          deliveryTime: authorizedQuotation.delivery_time,
          commercialConditions: authorizedQuotation.commercial_conditions,
          observations: authorizedQuotation.observations
        }
      };

      const updateOrderResult = await client.query(updateOrderQuery, [
        session.user.id,
        JSON.stringify(authorizationDetails),
        orderId
      ]);

      // 6. Marcar la cotización como autorizada
      const updateQuotationQuery = `
        UPDATE medication_quotations 
        SET status = 'Autorizada'
        WHERE id = $1
      `;

      await client.query(updateQuotationQuery, [authorizedQuotationId]);

      // 7. Marcar otras cotizaciones como rechazadas
      const rejectOtherQuotationsQuery = `
        UPDATE medication_quotations 
        SET status = 'Rechazada'
        WHERE medication_order_item_id = $1 AND id != $2
      `;

      await client.query(rejectOtherQuotationsQuery, [authorizedQuotation.item_id, authorizedQuotationId]);

      // 8. Enviar notificación al operador
      if (order.created_by_email) {
        const operatorNotification = sendMail({
          to: order.created_by_email,
          subject: `[OSPIF] Orden de Medicación Autorizada - #${orderId}`,
          text: `
Hola ${order.created_by_name},

La orden de medicación #${orderId} para el beneficiario ${order.beneficiary_name} ha sido autorizada.

Droguería Autorizada: ${authorizedQuotation.pharmacy_name}
Medicamento: ${authorizedQuotation.medication_name} ${authorizedQuotation.dosage}
Precio Total: $${authorizedQuotation.total_price}
Disponibilidad: ${authorizedQuotation.availability}

Notas de Autorización: ${authorizationNotes || 'Sin notas adicionales'}

Puede proceder con la gestión de la orden.

Gracias,
Equipo OSPIF
          `,
          html: `
            <p>Hola <strong>${order.created_by_name}</strong>,</p>
            
            <p>La orden de medicación <strong>#${orderId}</strong> para el beneficiario <strong>${order.beneficiary_name}</strong> ha sido autorizada.</p>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">✅ Autorización Aprobada</h3>
              <p><strong>Droguería:</strong> ${authorizedQuotation.pharmacy_name}</p>
              <p><strong>Medicamento:</strong> ${authorizedQuotation.medication_name} ${authorizedQuotation.dosage}</p>
              <p><strong>Precio Total:</strong> $${authorizedQuotation.total_price}</p>
              <p><strong>Disponibilidad:</strong> ${authorizedQuotation.availability}</p>
              ${authorizedQuotation.delivery_time ? `<p><strong>Tiempo de Entrega:</strong> ${authorizedQuotation.delivery_time}</p>` : ''}
            </div>
            
            ${authorizationNotes ? `<p><strong>Notas de Autorización:</strong> ${authorizationNotes}</p>` : ''}
            
            <p>Puede proceder con la gestión de la orden.</p>
            
            <p>Gracias,<br/>Equipo OSPIF</p>
          `
        }).catch(error => {
          console.error('Error enviando notificación al operador:', error);
        });
      }

      // 9. Enviar notificación a la droguería autorizada
      if (authorizedQuotation.pharmacy_email) {
        const pharmacyNotification = sendMail({
          to: authorizedQuotation.pharmacy_email,
          subject: `[OSPIF] Cotización Autorizada - Orden #${orderId}`,
          text: `
Estimados ${authorizedQuotation.pharmacy_name},

Su cotización para la orden de medicación #${orderId} ha sido autorizada.

Detalles de la Orden:
- Beneficiario: ${order.beneficiary_name}
- Diagnóstico: ${order.diagnosis}
- Médico Solicitante: ${order.requesting_doctor}
- Medicamento: ${authorizedQuotation.medication_name} ${authorizedQuotation.dosage}
- Cantidad: ${authorizedQuotation.quantity} ${authorizedQuotation.unit}
- Precio Autorizado: $${authorizedQuotation.total_price}

Por favor, proceda con la preparación y entrega según las condiciones acordadas.

Gracias,
Equipo OSPIF
          `,
          html: `
            <p>Estimados <strong>${authorizedQuotation.pharmacy_name}</strong>,</p>
            
            <p>Su cotización para la orden de medicación <strong>#${orderId}</strong> ha sido autorizada.</p>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">✅ Cotización Autorizada</h3>
              <p><strong>Beneficiario:</strong> ${order.beneficiary_name}</p>
              <p><strong>Diagnóstico:</strong> ${order.diagnosis}</p>
              <p><strong>Médico Solicitante:</strong> ${order.requesting_doctor}</p>
              <p><strong>Medicamento:</strong> ${authorizedQuotation.medication_name} ${authorizedQuotation.dosage}</p>
              <p><strong>Cantidad:</strong> ${authorizedQuotation.quantity} ${authorizedQuotation.unit}</p>
              <p><strong>Precio Autorizado:</strong> $${authorizedQuotation.total_price}</p>
            </div>
            
            <p>Por favor, proceda con la preparación y entrega según las condiciones acordadas.</p>
            
            <p>Gracias,<br/>Equipo OSPIF</p>
          `
        }).catch(error => {
          console.error('Error enviando notificación a la droguería:', error);
        });
      }

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Orden autorizada exitosamente.',
        order: {
          id: String(orderId),
          status: 'Autorizada',
          authorizedAt: new Date().toISOString(),
          authorizedBy: session.user.id,
          authorizedQuotation: {
            id: String(authorizedQuotationId),
            pharmacy: {
              id: String(authorizedQuotation.pharmacy_id),
              name: authorizedQuotation.pharmacy_name,
              contactPerson: authorizedQuotation.contact_person
            },
            item: {
              id: String(authorizedQuotation.item_id),
              medicationName: authorizedQuotation.medication_name,
              dosage: authorizedQuotation.dosage,
              quantity: authorizedQuotation.quantity,
              unit: authorizedQuotation.unit
            },
            totalPrice: authorizedQuotation.total_price,
            availability: authorizedQuotation.availability
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error al autorizar orden de medicación:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 