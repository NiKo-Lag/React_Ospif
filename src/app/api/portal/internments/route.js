// src/app/api/portal/internments/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

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
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const creatorId = session.user.id;
  const creatorRole = session.user.role;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const formData = await request.formData();
    const detailsString = formData.get('details');
    const files = formData.getAll('files');
    
    if (!detailsString) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Faltan los detalles de la internación.' }, { status: 400 });
    }

    const detailsPayload = JSON.parse(detailsString);
    const { beneficiary, formData: internmentData, provider_id } = detailsPayload;

    // Determinar a quién se le asigna la internación.
    // Si el que crea es un 'provider', se le asigna a sí mismo.
    // Si es otro rol (operador/admin), debe venir en los datos del formulario.
    const assignedProviderId = (creatorRole === 'provider' || creatorRole === 'prestador') ? creatorId : provider_id;
    
    if (!assignedProviderId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'No se ha especificado un prestador para la internación.' }, { status: 400 });
    }

    // 1. Obtener CUIT del prestador
    const providerResult = await client.query('SELECT cuit FROM prestadores WHERE id = $1', [assignedProviderId]);
    if (providerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'No se encontró el prestador.' }, { status: 404 });
    }
    const providerCuit = providerResult.rows[0].cuit;

    // 2. Insertar la internación con el estado inicial y la documentación
    const insertQuery = `
      INSERT INTO internments (
        id, notifying_provider_id, beneficiary_cuil, beneficiary_name, 
        admission_datetime, character, admission_type, admission_sector,
        admission_reason, attending_doctor, room_number, presumptive_diagnosis,
        clinical_summary, status, documentation, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id;
    `;
    
    // 3. Procesar y renombrar archivos
    await ensureStorageDirectoryExists();
    const uploadedDocumentation = [];
    const beneficiaryNameSanitized = beneficiary.nombre.replace(/[^a-zA-Z0-9]/g, '');
    const newInternmentId = Date.now(); 

    for (const [index, file] of files.entries()) {
      const fileExtension = path.extname(file.name);
      const newFilename = `${newInternmentId}_${beneficiaryNameSanitized}_${providerCuit}_${index + 1}${fileExtension}`;
      
      const fileBuffer = await file.arrayBuffer();
      const filePath = path.join(process.cwd(), 'storage', newFilename);
      
      await fs.writeFile(filePath, Buffer.from(fileBuffer));

      uploadedDocumentation.push({
        filename: newFilename,
        originalFilename: file.name,
        uploadDate: new Date().toISOString(),
        uploader: session.user.name, // Usamos el nombre de la sesión
      });
    }

    const initialDetails = { 
        comments: internmentData.additionalComments, 
        extension_requests: [],
        events: [] // Inicializar array de eventos
    };
    const insertValues = [
      newInternmentId,
      assignedProviderId, 
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
      'INICIADA', // <<< CORRECCIÓN CLAVE
      JSON.stringify(uploadedDocumentation),
      JSON.stringify(initialDetails)
    ];
    
    const result = await client.query(insertQuery, insertValues);
    const createdId = result.rows[0].id;

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Denuncia de internación creada con éxito.', id: createdId }, { status: 201 });

  } catch (error) {
    // Si ya se ha iniciado una transacción, hacer rollback
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error("Error al crear la denuncia de internación:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
} 