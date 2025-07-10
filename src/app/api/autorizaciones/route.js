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

/**
 * Obtiene todas las autorizaciones para el tablero Kanban.
 */
export async function GET() {
  try {
    // Consulta SQL formateada para mayor legibilidad.
    const query = `
      SELECT 
        id, 
        to_char(created_at, 'DD/MM/YYYY') as date, 
        type, 
        title, 
        beneficiary_name as beneficiary, 
        status, 
        is_important as "isImportant", 
        details 
      FROM authorizations 
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query);

    // (Opcional) Descomenta esta línea si necesitas depurar la estructura de un registro.
    // if (result.rows.length > 0) {
    //   console.log('Estructura de "details" para depuración:', result.rows[0].details);
    // }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al obtener autorizaciones:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Crea una nueva autorización, procesando los datos y el archivo adjunto.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
    const attachment = formData.get('attachment');
    
    if (!detailsString) {
      return NextResponse.json({ message: 'Faltan los detalles de la solicitud.' }, { status: 400 });
    }

    const details = JSON.parse(detailsString);
    
    // --- Validación de datos clave ---
    // Nos aseguramos de que los datos necesarios existan antes de continuar.
    if (!details.practice || !details.beneficiaryData?.cuil || !details.beneficiaryData?.nombre) {
        return NextResponse.json({ message: 'Faltan datos esenciales en la solicitud (práctica, CUIL o nombre del beneficiario).' }, { status: 400 });
    }

    const newId = Date.now();
    let attachmentUrl = null;

    // --- Manejo del archivo adjunto ---
    if (attachment) {
      const bytes = await attachment.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Guardamos en una carpeta 'storage' en la raíz del proyecto para mayor seguridad.
      const uploadDir = path.join(process.cwd(), 'storage');
      const filename = `${newId}-${attachment.name}`;
      const filePath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      await writeFile(filePath, buffer);

      // La URL apunta a una API route que sirve los archivos de forma segura.
      attachmentUrl = `/api/files/${filename}`;
      console.log(`Archivo guardado de forma segura en: ${filePath}`);
    }

    // Combinamos los detalles originales con la URL del archivo.
    const finalDetails = {
      ...details,
      attachmentUrl: attachmentUrl, // Será null si no hay archivo.
    };

    const query = `
      INSERT INTO authorizations (id, type, title, beneficiary_name, status, is_important, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      newId,
      'Práctica Médica', // Tipo fijo por ahora.
      details.practice,
      details.beneficiaryData.nombre,
      'Nuevas Solicitudes', // Estado inicial.
      details.isImportant || false, // Valor por defecto si no se provee.
      JSON.stringify(finalDetails), // El objeto completo se guarda como JSON.
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error("Error al crear la autorización:", error);
    // Devuelve un mensaje de error más específico si es un error de parseo de JSON.
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'El formato de los detalles (JSON) es inválido.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
