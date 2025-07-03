// Helpers para verificar tokens JWT y obtener la sesión del usuario.
const jwt = require('jsonwebtoken');
const { cookies } = require('next/headers');
const SECRET_KEY = 'tu-clave-secreta-muy-segura-y-dificil-de-adivinar';

function getSession() {
    const token = cookies().get('token')?.value;
    if (!token) return null;
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
}

module.exports = { getSession, SECRET_KEY };
