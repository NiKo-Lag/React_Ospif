import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 403 });
  }

  const { resourceType, resourceId } = await request.json();

  if (!resourceType || !resourceId) {
    return NextResponse.json({ message: 'El tipo y el ID del recurso son requeridos.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // 1. Verificar si ya existe un enlace para este recurso
    const existingLinkQuery = 'SELECT token FROM share_links WHERE resource_type = $1 AND resource_id = $2';
    const existingLinkResult = await client.query(existingLinkQuery, [resourceType, resourceId]);

    if (existingLinkResult.rowCount > 0) {
      // Si ya existe, simplemente devolvemos el token existente
      return NextResponse.json({ token: existingLinkResult.rows[0].token });
    }

    // 2. Si no existe, creamos uno nuevo
    const newToken = randomUUID();
    
    const insertLinkQuery = `
      INSERT INTO share_links (token, resource_type, resource_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING token;
    `;
    const insertResult = await client.query(insertLinkQuery, [newToken, resourceType, resourceId, session.user.id]);
    
    return NextResponse.json({ token: insertResult.rows[0].token });

  } catch (error) {
    console.error("Error al crear el enlace para compartir:", error);
    return NextResponse.json({ message: 'Error interno del servidor al crear el enlace.' }, { status: 500 });
  } finally {
    client.release();
  }
} 