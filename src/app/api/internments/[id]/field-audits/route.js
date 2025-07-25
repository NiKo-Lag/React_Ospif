// src/app/api/internments/[id]/field-audits/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { sendMail } from '@/lib/email'; // Importar nuestro nuevo helper
import fs from 'fs/promises';
import path from 'path';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { id: internmentId } = params;
  const requesterUserId = session.user.id;
  const client = await pool.connect();

  try {
    const data = await request.formData();
    
    const assignedAuditorId = data.get('assignedAuditorId');
    const requestReason = data.get('requestReason');
    const additionalComments = data.get('additionalComments');
    const notifyProviderAfterHours = data.get('notifyProviderAfterHours');
    const scheduledVisitDate = data.get('scheduledVisitDate');
    const isUrgent = data.get('isUrgent') === 'true'; // FormData convierte booleano a string
    const files = data.getAll('attachments');

    if (!assignedAuditorId || !scheduledVisitDate || !requestReason) {
      return NextResponse.json({ message: 'Faltan campos requeridos (auditor, fecha o motivo).' }, { status: 400 });
    }

    await client.query('BEGIN');

    const internmentRes = await client.query('SELECT status FROM internments WHERE id = $1', [internmentId]);
    if (internmentRes.rowCount === 0) {
      throw new Error('Internación no encontrada.');
    }
    
    const internmentStatus = internmentRes.rows[0].status;
    if (['FINALIZADA', 'INACTIVA'].includes(internmentStatus)) {
      throw new Error(`No se puede auditar una internación en estado '${internmentStatus}'.`);
    }

    const combinedReason = additionalComments 
      ? `${requestReason}\n\nComentarios adicionales:\n${additionalComments}`
      : requestReason;

    const insertAuditQuery = `
      INSERT INTO field_audits (
        internment_id, assigned_auditor_id, requester_operator_id, 
        request_reason, notify_provider_after_hours, scheduled_visit_date, is_urgent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const auditResult = await client.query(insertAuditQuery, [
      internmentId, 
      assignedAuditorId, 
      requesterUserId, 
      combinedReason, 
      notifyProviderAfterHours || 0,
      scheduledVisitDate,
      isUrgent
    ]);
    const newAuditId = auditResult.rows[0].id;

    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size === 0) continue;

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueFilename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storagePath = path.join(process.cwd(), 'storage', uniqueFilename);
        
        await fs.writeFile(storagePath, buffer);

        const insertAttachmentQuery = `
          INSERT INTO field_audit_attachments (field_audit_id, file_path, original_filename, mime_type, uploaded_by)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(insertAttachmentQuery, [newAuditId, uniqueFilename, file.name, file.type, requesterUserId]);
      }
    }

    // Si la auditoría es urgente, crear una notificación y enviar correo
    if (isUrgent) {
      // Obtener datos para la notificación y el correo
      const detailsRes = await client.query(
        'SELECT u.email as auditor_email, u.name as auditor_name, i.beneficiary_name FROM users u, internments i WHERE u.id = $1 AND i.id = $2',
        [assignedAuditorId, internmentId]
      );
      const { auditor_email, auditor_name, beneficiary_name } = detailsRes.rows[0] || {};
      
      const notificationMessage = `URGENTE: Se le ha asignado una nueva auditoría de terreno para el beneficiario ${beneficiary_name || 'N/D'}.`;
      const notificationLink = `/internments/${internmentId}`; // O la ruta que lleve al detalle

      // 1. Crear notificación en la plataforma
      const insertNotificationQuery = `
        INSERT INTO notifications (user_id, message, link, read)
        VALUES ($1, $2, $3, FALSE);
      `;
      await client.query(insertNotificationQuery, [assignedAuditorId, notificationMessage, notificationLink]);

      // 2. Enviar correo electrónico
      if (auditor_email) {
        await sendMail({
          to: auditor_email,
          subject: `[URGENTE] Nueva Auditoría de Terreno Asignada`,
          text: `Hola ${auditor_name},\n\nSe te ha asignado una nueva auditoría de terreno con carácter de URGENCIA.\n\nBeneficiario: ${beneficiary_name}\nID de Internación: ${internmentId}\n\nPor favor, revisa los detalles en la plataforma lo antes posible.\n\nGracias,\nEquipo OSPIF`,
          html: `
            <p>Hola <strong>${auditor_name}</strong>,</p>
            <p>Se te ha asignado una nueva auditoría de terreno con carácter de <strong>URGENCIA</strong>.</p>
            <ul>
              <li><strong>Beneficiario:</strong> ${beneficiary_name}</li>
              <li><strong>ID de Internación:</strong> ${internmentId}</li>
            </ul>
            <p>Por favor, revisa los detalles en la plataforma lo antes posible.</p>
            <p>Gracias,<br/>Equipo OSPIF</p>
          `
        });
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'Solicitud de auditoría de terreno creada con éxito.',
      auditId: newAuditId 
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al crear la solicitud de auditoría de terreno:", error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
} 