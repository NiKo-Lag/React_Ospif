// src/app/api/portal/notifications/[id]/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  const notificationId = params.id;

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  if (!notificationId) {
    return NextResponse.json({ message: 'No se proporcionó el ID de la notificación.' }, { status: 400 });
  }

  try {
    const providerId = session.user.id;

    if (!providerId) {
      return NextResponse.json({ message: 'ID de prestador no encontrado en la sesión.' }, { status: 401 });
    }

    const updateQuery = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND provider_id = $2;
    `;
    const result = await pool.query(updateQuery, [notificationId, providerId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Notificación no encontrada o no pertenece al usuario.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notificación marcada como leída.' });

  } catch (error) {
    console.error("Error al marcar la notificación como leída:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

