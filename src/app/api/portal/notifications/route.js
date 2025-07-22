// src/app/api/portal/notifications/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route'; // Importamos la configuración

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  
  const providerId = session.user.id;

  if (!providerId) {
    return NextResponse.json({ message: 'ID de prestador no encontrado en la sesión.' }, { status: 401 });
  }

  try {
    const query = `
      SELECT id, message, is_read, created_at, internment_id
      FROM notifications
      WHERE provider_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [providerId]);
    
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
