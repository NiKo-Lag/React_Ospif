// src/app/api/portal/login/route.js

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET_KEY no está definida.');
}

/**
 * Maneja el inicio de sesión de un prestador.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const email = body.email ? body.email.trim() : '';
    const password = body.password ? body.password.trim() : '';

    if (!email || !password) {
      return NextResponse.json({ message: 'El correo electrónico y la contraseña son obligatorios.' }, { status: 400 });
    }

    const query = 'SELECT * FROM prestadores WHERE email = $1';
    const result = await pool.query(query, [email]);
    const provider = result.rows[0];
    
    if (!provider) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    const passwordFromDB = provider.password ? provider.password.trim() : '';
    const isPasswordValid = await bcrypt.compare(password, passwordFromDB);
    
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    const tokenPayload = {
      id: provider.id,
      email: provider.email,
      name: provider.razonsocial,
      role: 'provider',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ message: 'Inicio de sesión exitoso.' });

  } catch (error) {
    console.error("Error en el login del portal:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
