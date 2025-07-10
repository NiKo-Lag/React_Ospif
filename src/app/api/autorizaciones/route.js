// src/app/api/autorizaciones/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

// --- CONEXIÓN A POSTGRESQL ---
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// La función GET no necesita cambios.
export async function GET() {
  try {
    const query = `
      SELECT 
        a.id, 
        to_char(a.created_at, 'DD/MM/YYYY') as date, 
        a.type, 
        a.title, 
        a.beneficiary_name as beneficiary, 
        a.status, 
        a.is_important as "isImportant", 
        a.details,
        p.razonSocial as provider_name,
        u.name as auditor_name
      FROM authorizations a
      LEFT JOIN prestadores p ON a.provider_id = p.id
      LEFT JOIN users u ON a.auditor_id = u.id
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al obtener autorizaciones:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Crea una nueva autorización.
 * **FUNCIÓN ACTUALIZADA**
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
    const attachment = formData.get('attachment');
    // --- 1. Obtenemos el ID de la internación desde el FormData ---
    const internmentId = formData.get('internment_id') || null;
    
    if (!detailsString) {
      return NextResponse.json({ message: 'Faltan los detalles de la solicitud.' }, { status: 400 });
    }

    const details = JSON.parse(detailsString);
    
    if (!details.practice || !details.beneficiaryData?.cuil) {
        return NextResponse.json({ message: 'Faltan datos esenciales en la solicitud.' }, { status: 400 });
    }

    const newId = Date.now();
    let attachmentUrl = null;

    if (attachment) {
      const bytes = await attachment.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), 'storage');
      const filename = `${newId}-${attachment.name}`;
      const filePath = path.join(uploadDir, filename);
      await mkdir(uploadDir, { recursive: true });
      await writeFile(filePath, buffer);
      attachmentUrl = `/api/files/${filename}`;
    }

    const providerId = details.provider_id || null;
    const auditorId = details.auditor_id || null;
    delete details.provider_id;
    delete details.auditor_id;
    
    const finalDetails = {
      ...details,
      attachmentUrl: attachmentUrl,
    };

    // --- 2. Actualizamos la consulta para incluir 'internment_id' ---
    const query = `
      INSERT INTO authorizations (id, type, title, beneficiary_name, status, is_important, details, provider_id, auditor_id, internment_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values = [
      newId,
      'Práctica Médica',
      details.practice,
      details.beneficiaryData.nombre,
      'Nuevas Solicitudes',
      details.isImportant || false,
      JSON.stringify(finalDetails),
      providerId,
      auditorId,
      // --- 3. Añadimos el ID de la internación a los valores ---
      internmentId
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error("Error al crear la autorización:", error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'El formato de los detalles (JSON) es inválido.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
