import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const session = getSession();

    if (!session) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json({
        username: session.username,
        role: session.role,
        modules: session.modules
    });
}
