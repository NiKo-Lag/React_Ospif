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

// ... (El código de la función GET no cambia)
export async function GET() {
  try {
    const result = await pool.query('SELECT id, to_char(created_at, \'DD/MM/YYYY\') as date, type, title, beneficiary_name as beneficiary, status, is_important as "isImportant", details FROM authorizations ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al obtener autorizaciones:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}


// Endpoint para CREAR una nueva autorización en PostgreSQL
export async function POST(request) {
  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
    const attachment = formData.get('attachment');
    
    if (!detailsString) {
      return NextResponse.json({ message: 'Faltan los detalles de la solicitud.' }, { status: 400 });
    }

    const details = JSON.parse(detailsString);
    const newId = Date.now();
    let attachmentUrl = null;

    if (attachment) {
      const bytes = await attachment.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // --- CAMBIO CLAVE: Guardamos en una carpeta PRIVADA ---
      const uploadDir = path.join(process.cwd(), 'storage');
      const filename = `${newId}-${attachment.name}`;
      const filePath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      await writeFile(filePath, buffer);

      // --- CAMBIO CLAVE: La URL ahora apunta a nuestra API "portero" ---
      attachmentUrl = `/api/files/${filename}`;
      console.log(`Archivo guardado de forma segura en: ${filePath}`);
    }

    const finalDetails = {
      ...details,
      attachmentUrl: attachmentUrl,
    };

    const query = `
      INSERT INTO authorizations (id, type, title, beneficiary_name, status, is_important, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      newId, 'Práctica Médica', details.practice, details.beneficiaryData.nombre, 
      'Nuevas Solicitudes', details.isImportant, JSON.stringify(finalDetails)
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error("Error al crear la autorización:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
