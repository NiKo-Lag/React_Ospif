import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Función para asegurar que el directorio de almacenamiento exista
async function ensureStorageDirectoryExists() {
  const storagePath = path.join(process.cwd(), 'storage');
  try {
    await fs.access(storagePath);
  } catch (error) {
    // Si el directorio no existe, lo creamos
    await fs.mkdir(storagePath, { recursive: true });
  }
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
  }

  const { id } = params; // ID de la internación

  try {
    const formData = await request.formData();
    const files = formData.getAll('files'); // 'files' debe coincidir con el nombre en el FormData del cliente
    
    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No se han proporcionado archivos.' }, { status: 400 });
    }
    
    // Asegurarse de que el directorio 'storage' exista
    await ensureStorageDirectoryExists();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener la documentación existente
      const { rows: internmentRows } = await client.query(
        'SELECT documentation FROM internments WHERE id = $1',
        [id]
      );

      if (internmentRows.length === 0) {
        return NextResponse.json({ message: 'Internación no encontrada.' }, { status: 404 });
      }

      let existingDocumentation = [];
      if (internmentRows[0].documentation) {
          try {
              // Aseguramos que parseamos el JSON si es un string.
              existingDocumentation = typeof internmentRows[0].documentation === 'string'
                  ? JSON.parse(internmentRows[0].documentation)
                  : internmentRows[0].documentation;

              if (!Array.isArray(existingDocumentation)) {
                  existingDocumentation = [];
              }
          } catch (e) {
              console.error("Error al parsear la documentación existente:", e);
              existingDocumentation = [];
          }
      }

      const newDocumentation = [...existingDocumentation];

      for (const file of files) {
        const fileBuffer = await file.arrayBuffer();
        const originalFilename = file.name;
        // Crear un nombre de archivo único para evitar colisiones
        const uniqueFilename = `${Date.now()}-${originalFilename.replace(/\s+/g, '_')}`;
        const filePath = path.join(process.cwd(), 'storage', uniqueFilename);
        
        // Guardar el archivo físicamente
        await fs.writeFile(filePath, Buffer.from(fileBuffer));

        // Añadir la información del archivo al array de documentación
        newDocumentation.push({
          filename: uniqueFilename,
          originalFilename: originalFilename,
          uploadDate: new Date().toISOString(),
          uploader: session.user.name,
        });
      }

      // Actualizar la base de datos con el nuevo array de documentación
      await client.query(
        'UPDATE internments SET documentation = $1 WHERE id = $2',
        [JSON.stringify(newDocumentation), id]
      );

      await client.query('COMMIT');

      return NextResponse.json({ 
        message: 'Documentación subida con éxito.', 
        documentation: newDocumentation 
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error("Error en la transacción de la base de datos:", dbError);
      return NextResponse.json({ message: 'Error en el servidor al procesar la subida.' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error al subir documentación:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
