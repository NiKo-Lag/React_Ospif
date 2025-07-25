// src/lib/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: process.env.EMAIL_SERVER_PORT,
  secure: process.env.EMAIL_SERVER_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  // Opcional: si el certificado SSL es autofirmado o da problemas.
  // tls: {
  //   rejectUnauthorized: false
  // }
});

/**
 * Envía un correo electrónico.
 * @param {Object} mailOptions - Opciones para el correo.
 * @param {string} mailOptions.to - Dirección del destinatario.
 * @param {string} mailOptions.subject - Asunto del correo.
 * @param {string} mailOptions.text - Cuerpo del correo en texto plano.
 * @param {string} mailOptions.html - Cuerpo del correo en HTML.
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // Remitente definido en .env.local
      to,
      subject,
      text,
      html,
    });
    console.log('Correo enviado exitosamente:', info.messageId);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    // En un entorno de producción, sería bueno registrar este error en un servicio de logging.
    // Por ahora, no relanzamos el error para no detener el flujo principal de la API si el correo falla.
  }
}

module.exports = { sendMail }; 