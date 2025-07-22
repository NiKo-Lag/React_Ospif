import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';

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
        await fs.mkdir(storagePath, { recursive: true });
    }
}

/**
 * Añade una nueva solicitud de presupuesto al historial de una internación.
 */
export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'provider') {
        return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    const { id } = params; // ID de la internación
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener datos necesarios Y EL ESTADO, y bloquear la fila para la transacción
        const internmentRes = await client.query('SELECT status, beneficiary_name, documentation, details FROM internments WHERE id = $1 AND provider_id = $2 FOR UPDATE', [id, session.user.id]);
        if (internmentRes.rowCount === 0) {
            throw new Error('Internación no encontrada o sin permisos.');
        }

        const { status, beneficiary_name, documentation, details } = internmentRes.rows[0];
        
        // 2. VERIFICAR ESTADO
        if (!['INICIADA', 'ACTIVA'].includes(status)) {
            throw new Error('Acción no permitida. La internación no se encuentra en un estado válido para solicitar presupuestos.');
        }

        const providerCuit = session.user.cuit; 
        let existingDocumentation = Array.isArray(documentation) ? documentation : [];

        // 3. Procesar formulario y archivos
        const formData = await request.formData();
        const budgetDataString = formData.get('budgetData');
        const files = formData.getAll('files');
        const budgetData = JSON.parse(budgetDataString);

        await ensureStorageDirectoryExists();

        for (const [index, file] of files.entries()) {
            const originalFilename = file.name;
            const sanitizedBeneficiaryName = beneficiary_name.replace(/\s+/g, '_');
            const fileExtension = path.extname(originalFilename);
            const baseFilename = `${id}_${sanitizedBeneficiaryName}_${providerCuit}_${existingDocumentation.length + index + 1}`;
            const uniqueFilename = `${baseFilename}${fileExtension}`;

            const filePath = path.join(process.cwd(), 'storage', uniqueFilename);
            const fileBuffer = await file.arrayBuffer();
            await fs.writeFile(filePath, Buffer.from(fileBuffer));

            existingDocumentation.push({
                filename: uniqueFilename,
                originalFilename: originalFilename,
                uploadDate: new Date().toISOString(),
                uploader: session.user.name,
                origin: 'budget_request', // 3. Etiqueta de Origen
            });
        }

        // 4. Preparar el evento de presupuesto (sin archivos)
        const newBudgetRequest = {
            id: `budget_${Date.now()}`,
            type: 'budget_request',
            requested_at: new Date().toISOString(),
            requested_by_provider_id: session.user.id,
            requested_by_provider_name: session.user.name,
            ...budgetData,
            status: 'Pendiente de Auditoría',
            auditor_id: null,
            audited_at: null,
            auditor_comment: null,
            approved_amount: null,
        };
        
        const existingEvents = details?.events || [];
        const updatedEvents = [...existingEvents, newBudgetRequest];
        const updatedDetails = { ...details, events: updatedEvents };

        // 5. Actualizar la internación con los nuevos documentos y el nuevo evento en una sola consulta
        const query = `
            UPDATE internments
            SET documentation = $1, details = $2
            WHERE id = $3;
        `;
        await client.query(query, [JSON.stringify(existingDocumentation), updatedDetails, id]);

        await client.query('COMMIT');
        
        return NextResponse.json({ message: 'Solicitud de presupuesto enviada con éxito.' }, { status: 201 });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al solicitar presupuesto:", error);
        // Devolver un 403 si el error fue por el estado
        if (error.message.includes('Acción no permitida')) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
} 