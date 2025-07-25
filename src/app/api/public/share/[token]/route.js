import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ message: 'Token no proporcionado.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // 1. Encontrar el recurso asociado al token
    const linkQuery = 'SELECT resource_type, resource_id FROM share_links WHERE token = $1';
    const linkResult = await client.query(linkQuery, [token]);

    if (linkResult.rowCount === 0) {
      return NextResponse.json({ message: 'Enlace no válido o expirado.' }, { status: 404 });
    }

    const { resource_type, resource_id } = linkResult.rows[0];
    let resourceData = null;

    // 2. Usar un switch para obtener los datos del recurso correcto
    switch (resource_type) {
      case 'internment':
        // Lógica para obtener los detalles de la internación
        const internmentQuery = 'SELECT * FROM internments WHERE id = $1';
        const internmentResult = await client.query(internmentQuery, [resource_id]);
        if (internmentResult.rowCount > 0) {
            const internment = internmentResult.rows[0];
            // Aquí podemos añadir lógicas adicionales, como obtener prácticas asociadas si fuera necesario
            const practicesQuery = 'SELECT id, title, status, created_at FROM authorizations WHERE internment_id = $1 ORDER BY created_at DESC';
            const practicesResult = await client.query(practicesQuery, [resource_id]);

            const details = internment.details || {};
            details.practices = practicesResult.rows.map(p => ({ ...p, id: String(p.id) }));
            
            resourceData = { ...internment, id: String(internment.id), details };
        }
        break;
      
      // En el futuro, podríamos añadir más casos:
      // case 'practice':
      //   // Lógica para obtener detalles de una práctica/autorización
      //   break;

      default:
        return NextResponse.json({ message: 'Tipo de recurso no soportado.' }, { status: 400 });
    }

    if (!resourceData) {
      return NextResponse.json({ message: 'Recurso no encontrado.' }, { status: 404 });
    }
    
    // Devolvemos el tipo de recurso junto con los datos para que el frontend sepa qué componente renderizar
    return NextResponse.json({ resourceType: resource_type, data: resourceData });

  } catch (error) {
    console.error("Error al obtener el recurso compartido:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  } finally {
    client.release();
  }
} 