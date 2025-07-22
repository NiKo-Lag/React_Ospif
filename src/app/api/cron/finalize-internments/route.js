// src/app/api/cron/finalize-internments/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { calculateBusinessHoursSince } from '@/lib/date-utils';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});


export async function GET(request) {
  // 1. Seguridad
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const client = await pool.connect();
  try {
    // 2. Buscar internaciones relevantes
    const findQuery = `
      SELECT id, admission_datetime, provider_id, beneficiary_cuil
      FROM internments
      WHERE 
        status = 'Activa' 
        AND (
          details->'extension_requests' IS NULL OR 
          jsonb_array_length(details->'extension_requests') = 0
        )
    `;
    const candidates = await client.query(findQuery);
    
    const internmentsToFinalize = [];
    const internmentsToNotify = [];

    for (const internment of candidates.rows) {
      const businessHours = await calculateBusinessHoursSince(internment.admission_datetime);
      
      if (businessHours >= 48) {
        internmentsToFinalize.push(internment.id);
      } else if (businessHours >= 24) {
        internmentsToNotify.push({
          provider_id: internment.provider_id,
          internment_id: internment.id,
          message: `La internación del beneficiario con CUIL ${internment.beneficiary_cuil} está próxima a vencer. Se requiere una acción antes del ${new Date(internment.admission_datetime).toLocaleDateString('es-AR')}.`
        });
      }
    }

    // 4. Finalizar internaciones vencidas
    if (internmentsToFinalize.length > 0) {
      const updateQuery = `
        UPDATE internments
        SET 
          status = 'Finalizada',
          details = jsonb_set(
              COALESCE(details, '{}'::jsonb),
              '{system_notes}',
              '"Finalizada automáticamente por el sistema tras exceder las 48hs hábiles sin solicitud de prórroga."'::jsonb
          )
        WHERE id = ANY($1::bigint[])
      `;
      const result = await client.query(updateQuery, [internmentsToFinalize]);
      console.log(`CRON JOB: Se finalizaron automáticamente ${result.rowCount} internaciones.`);
    } else {
       console.log('CRON JOB: No hay internaciones para finalizar automáticamente.');
    }

    // 5. Crear notificaciones para internaciones próximas a vencer
    if (internmentsToNotify.length > 0) {
      // Evitar duplicados: solo insertar si no hay una notificación activa para esa internación
      const insertPromises = internmentsToNotify.map(notification => {
        const insertQuery = `
          INSERT INTO notifications (provider_id, internment_id, message)
          SELECT $1, $2, $3
          WHERE NOT EXISTS (
              SELECT 1 FROM notifications 
              WHERE internment_id = $2 AND is_read = FALSE
          );
        `;
        return client.query(insertQuery, [notification.provider_id, notification.internment_id, notification.message]);
      });
      
      const results = await Promise.all(insertPromises);
      const newNotificationsCount = results.filter(res => res.rowCount > 0).length;
      if (newNotificationsCount > 0) {
        console.log(`CRON JOB: Se crearon ${newNotificationsCount} nuevas notificaciones.`);
      } else {
        console.log('CRON JOB: No se crearon nuevas notificaciones (posiblemente ya existían).');
      }
    } else {
      console.log('CRON JOB: No hay internaciones próximas a vencer para notificar.');
    }
    
    return NextResponse.json({ 
        message: 'Cron job ejecutado.', 
        finalized: internmentsToFinalize.length,
        notified: internmentsToNotify.length 
    });

  } catch (error) {
    console.error("Error en el cron job de finalización/notificación:", error);
    return NextResponse.json({ message: 'Error interno del servidor en el cron job.' }, { status: 500 });
  } finally {
    client.release();
  }
} 