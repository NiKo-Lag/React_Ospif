import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
    cookies().set('token', '', {
        httpOnly: true,
        expires: new Date(0), // Expira inmediatamente
        path: '/',
    });
    return NextResponse.json({ success: true });
}
