// src/app/api/cron/finalize-internments/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Función para calcular horas hábiles (lunes a viernes)
function calculateBusinessHours(startDate) {
    let now = new Date();
    let current = new Date(startDate);
    let hours = 0;

    while (current < now) {
        const dayOfWeek = current.getDay();
        // 0: Domingo, 6: Sábado
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            hours++;
        }
        current.setHours(current.getHours() + 1);
    }
    return hours;
}


export async function GET(request) {
  // 1. Seguridad: Proteger el endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const client = await pool.connect();
  try {
    // 2. Buscar TODAS las internaciones activas sin prórrogas
    const findQuery = `
      SELECT id, admission_datetime 
      FROM internments
      WHERE 
        status = 'Activa' 
        AND (
          details->'extension_requests' IS NULL OR 
          jsonb_array_length(details->'extension_requests') = 0
        )
    `;
    const candidates = await client.query(findQuery);
    
    // 3. Filtrar en la aplicación según las horas hábiles
    const idsToFinalize = candidates.rows
      .filter(internment => {
        const businessHours = calculateBusinessHours(internment.admission_datetime);
        return businessHours >= 48;
      })
      .map(internment => internment.id);

    if (idsToFinalize.length === 0) {
      console.log('CRON JOB: No hay internaciones para finalizar automáticamente (lógica de días hábiles).');
      return NextResponse.json({ message: 'No hay internaciones para finalizar.' });
    }

    // 4. Actualizar las internaciones encontradas
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
    const result = await client.query(updateQuery, [idsToFinalize]);
    
    console.log(`CRON JOB: Se finalizaron automáticamente ${result.rowCount} internaciones (lógica de días hábiles).`);
    return NextResponse.json({ message: `Se finalizaron ${result.rowCount} internaciones.` });

  } catch (error) {
    console.error("Error en el cron job de finalización de internaciones:", error);
    return NextResponse.json({ message: 'Error interno del servidor en el cron job.' }, { status: 500 });
  } finally {
    client.release();
  }
} 