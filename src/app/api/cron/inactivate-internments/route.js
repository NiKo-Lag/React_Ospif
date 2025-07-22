import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { calculateBusinessHoursSince } from '@/lib/date-utils';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const client = await pool.connect();
  try {
    const findQuery = `
      SELECT id, admission_datetime
      FROM internments
      WHERE status = 'INICIADA'
    `;
    const candidates = await client.query(findQuery);
    
    const internmentsToInactivate = [];

    for (const internment of candidates.rows) {
      const businessHours = await calculateBusinessHoursSince(internment.admission_datetime);
      if (businessHours >= 48) {
        internmentsToInactivate.push(internment.id);
      }
    }

    if (internmentsToInactivate.length > 0) {
      const updateQuery = `
        UPDATE internments
        SET 
          status = 'INACTIVA',
          details = jsonb_set(
              COALESCE(details, '{}'::jsonb),
              '{system_notes}',
              '"Inactivada automáticamente por el sistema tras exceder las 48hs hábiles sin solicitud de prórroga."'::jsonb,
              true
          )
        WHERE id = ANY($1::bigint[])
      `;
      const result = await client.query(updateQuery, [internmentsToInactivate]);
      console.log(`CRON JOB: Se inactivaron automáticamente ${result.rowCount} internaciones.`);
    } else {
       console.log('CRON JOB: No hay internaciones para inactivar automáticamente.');
    }
    
    return NextResponse.json({ 
        message: 'Cron job de inactivación ejecutado.', 
        inactivated: internmentsToInactivate.length
    });

  } catch (error) {
    console.error("Error en el cron job de inactivación:", error);
    return NextResponse.json({ message: 'Error interno del servidor en el cron job.' }, { status: 500 });
  } finally {
    client.release();
  }
} 