import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    // Lista de nombres de cookies a eliminar
    const cookieNames = ['token', 'provider_token', 'user_token', 'admin_token'];

    try {
        cookieNames.forEach(name => {
            cookies().set(name, '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                expires: new Date(0),
                path: '/',
            });
        });

        return NextResponse.json({ success: true, message: 'Cierre de sesión exitoso.' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 });
    }
}
