<<<<<<< HEAD
import { db, hashPassword } from '@/lib/db';
import { SECRET_KEY } from '@/lib/auth';
=======
// src/app/api/login/route.js

import { db, hashPassword } from '@/lib/db'; // Asumimos que db.js es compatible
>>>>>>> master
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
    const { username, password } = await request.json();
    
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (user && user.password === hashPassword(password) && user.status === 'active') {
<<<<<<< HEAD
=======
            
            // --- CAMBIO CLAVE: Usamos la variable de entorno directamente ---
>>>>>>> master
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role, 
<<<<<<< HEAD
                    // LÍNEA CORREGIDA: Si no hay módulos, usa un array vacío.
                    modules: user.modules ? user.modules.split(',') : [] 
                },
                SECRET_KEY,
=======
                    modules: user.modules ? user.modules.split(',') : [] 
                },
                process.env.JWT_SECRET_KEY, // 🔑 Usando la misma clave que en getSession
>>>>>>> master
                { expiresIn: '8h' }
            );

            cookies().set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
<<<<<<< HEAD
                maxAge: 8 * 60 * 60, // 8 horas
=======
                maxAge: 8 * 60 * 60, // 8 horas en segundos
>>>>>>> master
                path: '/',
            });

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, message: 'Credenciales inválidas o usuario inactivo.' }, { status: 401 });
        }
    } catch (error) {
        console.error("Error en la API de login:", error);
        return NextResponse.json({ message: 'Error en el servidor al procesar el login.' }, { status: 500 });
    }
}