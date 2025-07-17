// src/lib/auth.js

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET_KEY;

/**
 * Verifica un token JWT.
 * @param {string} token - El token JWT a verificar.
 * @returns {object|null} - El payload decodificado si el token es válido, de lo contrario null.
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    console.error("Error al verificar el token:", error.message);
    return null;
  }
}

/**
 * Obtiene la sesión del usuario desde las cookies en Server Components.
 * @returns {Promise<object|null>} - El payload decodificado de la sesión.
 */
export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  return verifyToken(token);
}