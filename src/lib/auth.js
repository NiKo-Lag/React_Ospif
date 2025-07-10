// src/lib/auth.js (o donde tengas el archivo)

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// 1. La clave secreta ahora se lee de las variables de entorno. ¡Mucho más seguro!
const SECRET_KEY = process.env.JWT_SECRET_KEY;

// 2. La función ahora es 'async' para ser compatible con Next.js
export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    // jwt.verify es síncrono, pero lo mantenemos dentro de una función async
    // para poder usar `cookies()` correctamente.
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded;
  } catch (error) {
    // El token no es válido (expirado, malformado, etc.)
    console.error("Error al verificar el token:", error.message);
    return null;
  }
}

// 3. Así se exporta en la sintaxis moderna de ES Modules.
// (No es necesario exportar la clave secreta)