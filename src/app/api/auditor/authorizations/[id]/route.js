// src/app/api/auditor/authorizations/[id]/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Mapeo de acciones a estados de la base de datos
const actionToStatusMap = {
    'Aprobar': 'Autorizada',
    'Rechazar': 'Rechazada',
    'Devolver': 'Requiere Corrección',
};

export async function PATCH(request, { params }) {
    const session = await getServerSession(authOptions);

    // 1. Verificar autenticación y rol de auditor
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    if (session.user.role !== 'auditor') {
        return NextResponse.json({ message: 'Acceso denegado. Se requiere rol de auditor.' }, { status: 403 });
    }

    const client = await pool.connect(); // Usamos un cliente para la transacción
    try {
        await client.query('BEGIN'); // Iniciar transacción

        const { id } = params;
        const { action, comment } = await request.json();
        const newStatus = actionToStatusMap[action];

        if (!newStatus) {
            return NextResponse.json({ message: 'Acción no válida.' }, { status: 400 });
        }

        // 2. Actualizar la autorización, devolviendo los datos necesarios para la notificación
        const updateQuery = `
            UPDATE authorizations
            SET 
                status = $1,
                auditor_id = $2,
                audited_at = NOW(),
                details = jsonb_set(
                    COALESCE(details, '{}'::jsonb), 
                    '{auditor_comment}', 
                    $3::jsonb
                )
            WHERE id = $4
            RETURNING provider_id, title, internment_id;
        `;
        
        const values = [newStatus, session.user.id, JSON.stringify(comment || ''), id];
        const result = await client.query(updateQuery, values);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'No se encontró la autorización para actualizar.' }, { status: 404 });
        }

        const { provider_id, title, internment_id } = result.rows[0];

        // 3. Crear la notificación para el prestador
        if (provider_id) {
            const notificationMessage = `El auditor ha realizado una acción (${action}) en la solicitud: "${title}".`;
            const insertNotificationQuery = `
                INSERT INTO notifications (provider_id, internment_id, message, is_read, related_authorization_id)
                VALUES ($1, $2, $3, FALSE, $4)
            `;
            await client.query(insertNotificationQuery, [provider_id, internment_id, notificationMessage, id]);
        }
        
        await client.query('COMMIT'); // Finalizar transacción

        return NextResponse.json({ message: `Solicitud ${action.toLowerCase()} con éxito.` });

    } catch (error) {
        await client.query('ROLLBACK'); // Revertir en caso de error
        console.error(`Error al auditar la autorización ${params.id}:`, error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    } finally {
        client.release();
    }
}

