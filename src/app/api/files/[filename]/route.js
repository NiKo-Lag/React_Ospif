// src/app/api/files/[filename]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route'; // RUTA CORREGIDA
import path from 'path';
import { readFile, stat } from 'fs/promises';

// --- FUNCIÓN HELPER PARA OBTENER EL TIPO DE ARCHIVO (MIME TYPE) ---
function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.txt': return 'text/plain';
    // Añade más tipos de archivo si los necesitas
    default: return 'application/octet-stream'; // Tipo genérico para descarga
  }
}

export async function GET(request, { params }) {
  // 1. VERIFICAR AUTENTICACIÓN (Refactorizado a NextAuth)
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new NextResponse('Acceso denegado', { status: 403 });
  }

  // 2. OBTENER Y SERVIR EL ARCHIVO
  const { filename } = params;
  
  // Por seguridad, evitamos que se pueda navegar a directorios superiores
  if (filename.includes('..')) {
      return new NextResponse('Nombre de archivo inválido', { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'storage', filename);

  try {
    // Verificamos que el archivo exista
    await stat(filePath);

    // Leemos el archivo del disco
    const fileBuffer = await readFile(filePath);

    // --- SOLUCIÓN: Obtenemos el tipo de archivo y lo enviamos en las cabeceras ---
    const mimeType = getMimeType(filename);

    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    // 'inline' sugiere al navegador que muestre el archivo en lugar de descargarlo
    headers.set('Content-Disposition', `inline; filename="${filename}"`);

    return new NextResponse(fileBuffer, { status: 200, headers });
    
  } catch (error) {
    // Si el archivo no existe o hay otro error, devolvemos un 404
    console.error("Error al servir el archivo:", error);
    return new NextResponse('Archivo no encontrado', { status: 404 });
  }
}
