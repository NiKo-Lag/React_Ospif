import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const { id } = params; // ID de la internación
  const client = await pool.connect();

  try {
    const { message, replyTo } = await request.json();
    if (!message || message.trim() === '') {
      return NextResponse.json({ message: 'El mensaje no puede estar vacío.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Obtener las observaciones existentes para no sobreescribir.
    const currentInternment = await client.query('SELECT details FROM internments WHERE id = $1 FOR UPDATE', [id]);
    if (currentInternment.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
    }
    const existingDetails = currentInternment.rows[0].details || {};
    const existingObservations = existingDetails.observations || [];

    // 2. Crear el nuevo objeto de observación
    const newObservation = {
      id: `obs_${Date.now()}`,
      author: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        image: session.user.image || null, // Asumiendo que la imagen del perfil está en la sesión
      },
      message: message.trim(),
      timestamp: new Date().toISOString(),
      replyTo: replyTo || null,
    };

    // 3. Añadir la nueva observación al array
    const updatedObservations = [...existingObservations, newObservation];
    
    // 4. Actualizar el campo 'details' en la base de datos
    const query = `
      UPDATE internments
      SET details = jsonb_set(
          COALESCE(details, '{}'::jsonb),
          '{observations}',
          $1::jsonb
      )
      WHERE id = $2
      RETURNING details;
    `;
    
    const result = await client.query(query, [JSON.stringify(updatedObservations), id]);

    await client.query('COMMIT');
    
    // Devolvemos todas las observaciones actualizadas
    return NextResponse.json(result.rows[0].details.observations);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al añadir observación:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
} 