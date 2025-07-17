// src/app/api/autorizaciones/route.js

import { NextResponse } from 'next/server';
<<<<<<< HEAD

// --- Base de Datos en Memoria (simulada) ---
const autorizacionesDB = [
  { id: 1001, type: 'Práctica Médica', title: 'Tomografía Computada', beneficiary: 'Juan Pérez (25123456789)', date: new Date(2025, 6, 4).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Nuevas Solicitudes', isImportant: true },
  { id: 1002, type: 'Internación', title: 'Internación por Apendicitis', beneficiary: 'Maria Lopez (27987654321)', date: new Date(2025, 6, 4).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Nuevas Solicitudes', isImportant: false },
  { id: 1003, type: 'Práctica Médica', title: 'Análisis de Sangre Completo', beneficiary: 'Carlos Gomez (20112233445)', date: new Date(2025, 6, 3).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'En Auditoría', isImportant: false },
  { id: 1004, type: 'Práctica Médica', title: 'Consulta Cardiológica', beneficiary: 'Ana Fernandez (27334455667)', date: new Date(2025, 6, 3).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Autorizadas', isImportant: false },
  { id: 1005, type: 'Medicamento', title: 'Medicamento Oncológico', beneficiary: 'Roberto Sanchez (20998877665)', date: new Date(2025, 6, 2).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), status: 'Rechazadas', isImportant: true }
];
let lastId = 1005; 

// --- FUNCIÓN GET: Para leer todas las autorizaciones ---
export async function GET(request) {
  // Simplemente devolvemos la lista completa.
  return NextResponse.json(autorizacionesDB);
}

// --- FUNCIÓN POST: Para crear una nueva autorización ---
=======
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
>>>>>>> master
export async function POST(request) {
  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
<<<<<<< HEAD
    if (!detailsString) {
      return NextResponse.json({ message: "Error: Faltan los detalles en el formulario." }, { status: 400 });
    }
    const details = JSON.parse(detailsString);
    if (!details.beneficiaryData || !details.beneficiaryData.cuil) {
      return NextResponse.json({ message: "Error: Faltan los datos del beneficiario." }, { status: 400 });
    }

    const newAuth = {
      id: ++lastId,
      type: formData.get('type'),
      title: formData.get('title'),
      beneficiary: `${details.beneficiaryData.apellido}, ${details.beneficiaryData.nombre} (${details.beneficiaryData.cuil})`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      status: 'Nuevas Solicitudes',
      wasEdited: false,
      isImportant: details.isImportant,
      details: details,
    };
    
    autorizacionesDB.unshift(newAuth); // Agregamos la nueva al principio
    return NextResponse.json(newAuth, { status: 201 });

  } catch (error) {
    console.error("Error al crear autorización:", error);
    return NextResponse.json({ message: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}
=======
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
>>>>>>> master
