// src/app/api/portal/internment/[id]/upload/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * Adjunta nuevos archivos a una internación existente.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params; // ID de la internación
    const data = await request.formData();
    const files = data.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No se han enviado archivos.' }, { status: 400 });
    }

    // 1. Verificar la sesión del prestador
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }
    jwt.verify(token.value, JWT_SECRET);

    // 2. Guardar los archivos en el servidor
    const attachmentUrls = [];
    for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'storage', 'internments', String(id));
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, file.name);
        await writeFile(filePath, buffer);
        attachmentUrls.push(`/api/files/internments/${id}/${file.name}`);
    }

    // 3. Actualizar el campo 'details' en la base de datos, añadiendo los nuevos adjuntos
    const query = `
      UPDATE internments
      SET details = jsonb_set(
          COALESCE(details, '{}'::jsonb),
          '{attachments}',
          COALESCE(details->'attachments', '[]'::jsonb) || $1::jsonb,
          true
      )
      WHERE id = $2
      RETURNING *;
    `;
    
    const result = await pool.query(query, [JSON.stringify(attachmentUrls), id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'No se pudo actualizar la internación. Verifique el ID.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Documentación subida con éxito.' });

  } catch (error) {
    console.error("Error al subir documentación:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
