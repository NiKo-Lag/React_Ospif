// src/app/api/portal/internments/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function ensureStorageDirectoryExists() {
  const storagePath = path.join(process.cwd(), 'storage');
  try {
    await fs.access(storagePath);
  } catch (error) {
    await fs.mkdir(storagePath, { recursive: true });
  }
}

export async function POST(request) {
  const tokenCookie = cookies().get('token');
  if (!tokenCookie) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }
  const decodedSession = verifyToken(tokenCookie.value);
  if (!decodedSession) {
    return NextResponse.json({ message: 'Sesión inválida o expirada.' }, { status: 401 });
  }

  const providerId = decodedSession.id;
  const client = await pool.connect();

  try {
    const formData = await request.formData();
    const detailsString = formData.get('details');
    const files = formData.getAll('files');
    
    if (!detailsString) {
      return NextResponse.json({ message: 'Faltan los detalles de la internación.' }, { status: 400 });
    }

    const { beneficiary, formData: internmentData } = JSON.parse(detailsString);

    await ensureStorageDirectoryExists();
    const uploadedDocumentation = [];

    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const originalFilename = file.name;
      const uniqueFilename = `${Date.now()}-${originalFilename.replace(/\s+/g, '_')}`;
      const filePath = path.join(process.cwd(), 'storage', uniqueFilename);
      
      await fs.writeFile(filePath, Buffer.from(fileBuffer));

      uploadedDocumentation.push({
        filename: uniqueFilename,
        originalFilename: originalFilename,
        uploadDate: new Date().toISOString(),
        uploader: decodedSession.name,
      });
    }
    
    await client.query('BEGIN');

    const newInternmentId = Date.now();

    // Corregido: La consulta ahora coincide con el esquema de la base de datos del usuario.
    const query = `
      INSERT INTO internments (
        id, notifying_provider_id, beneficiary_cuil, beneficiary_name, 
        admission_datetime, character, admission_type, admission_sector,
        admission_reason, attending_doctor, room_number, presumptive_diagnosis,
        clinical_summary, status, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    
    // Corregido: El objeto de detalles ahora incluye la documentación y los comentarios.
    const detailsPayload = {
        documentation: uploadedDocumentation,
        comments: internmentData.additionalComments,
        extension_requests: [],
    };

    // Corregido: El array de valores ahora coincide con la nueva consulta.
    const values = [
      newInternmentId,
      providerId,
      beneficiary.cuil,
      beneficiary.nombre,
      internmentData.admissionDatetime,
      internmentData.internmentType,
      internmentData.admissionType,
      internmentData.admissionSector,
      internmentData.admissionReason,
      internmentData.attendingDoctor,
      internmentData.roomNumber,
      internmentData.presumptiveDiagnosis,
      internmentData.clinicalSummary,
      'Activa',
      JSON.stringify(detailsPayload),
    ];

    await client.query(query, values);
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Denuncia de internación creada con éxito.', id: newInternmentId }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al crear la denuncia de internación:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  } finally {
    client.release();
  }
} 