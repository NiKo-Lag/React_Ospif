// src/app/api/internment/route.js

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
 * Crea una nueva denuncia de internación con todos los detalles del wizard.
 */
export async function POST(request) {
  try {
    // 1. Procesamos los datos del formulario, que vienen como FormData
    const data = await request.formData();
    const formDetailsString = data.get('details');
    const files = data.getAll('files');
    
    if (!formDetailsString) {
      return NextResponse.json({ message: 'Faltan los detalles del formulario.' }, { status: 400 });
    }

    // 2. Extraemos la información del JSON anidado
    const { beneficiary, formData } = JSON.parse(formDetailsString);
    const {
        internmentType, admissionDatetime, admissionType, admissionSector,
        admissionReason, attendingDoctor, roomNumber, presumptiveDiagnosis,
        clinicalSummary, additionalComments
    } = formData;

    // 3. Identificamos al prestador a partir del token de sesión
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');
    if (!token) {
        return NextResponse.json({ message: 'No autorizado: Sesión de prestador no encontrada.' }, { status: 401 });
    }
    const decodedToken = jwt.verify(token.value, JWT_SECRET);
    const notifyingProviderId = decodedToken.id;
    
    // Validación de datos esenciales
    if (!beneficiary?.cuil || !admissionDatetime || !notifyingProviderId || !presumptiveDiagnosis) {
      return NextResponse.json({ message: 'Faltan datos obligatorios (Beneficiario, Fecha, Prestador, Diagnóstico).' }, { status: 400 });
    }
    
    const newId = Date.now();

    // 4. Lógica para manejar los archivos adjuntos
    const attachmentUrls = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            // Creamos una carpeta única para los archivos de esta internación
            const uploadDir = path.join(process.cwd(), 'storage', 'internments', String(newId));
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, file.name);
            await writeFile(filePath, buffer);
            // Generamos una URL segura para acceder al archivo a través de una futura API de archivos
            attachmentUrls.push(`/api/files/internments/${newId}/${file.name}`);
        }
    }

    // Guardamos información secundaria en el campo 'details'
    const details = {
        additionalComments,
        attachments: attachmentUrls,
    };

    // 5. Consulta SQL actualizada con todas las columnas
    const query = `
      INSERT INTO internments (
        id, beneficiary_name, beneficiary_cuil, admission_datetime, character, 
        admission_reason, attending_doctor, notifying_provider_id, source, status,
        admission_type, admission_sector, room_number, presumptive_diagnosis, clinical_summary, details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Portal', 'Activa', $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    
    const values = [
      newId, beneficiary.nombre, beneficiary.cuil, admissionDatetime, internmentType,
      admissionReason, attendingDoctor, notifyingProviderId,
      admissionType, admissionSector, roomNumber, presumptiveDiagnosis, clinicalSummary, JSON.stringify(details)
    ];

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error("Error al crear la denuncia de internación:", error);
    return NextResponse.json({ message: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
