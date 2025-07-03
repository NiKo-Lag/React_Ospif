import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const session = getSession();
    if (!session) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    try {
        const prestadores = db.prepare('SELECT * FROM prestadores WHERE estado = ?').all('activo');
        return NextResponse.json(prestadores);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al obtener los prestadores' }, { status: 500 });
    }
}
