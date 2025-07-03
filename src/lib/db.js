// Este archivo centraliza la conexión a la base de datos y la configuración inicial.

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Asegura que la base de datos se cree en la raíz del proyecto, fuera de /src
const dbPath = path.join(process.cwd(), 'db.sqlite');
const db = new Database(dbPath);

function hashPassword(password) {
    const salt = 'una-sal-secreta-para-aumentar-la-seguridad';
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Función para inicializar la base de datos si no existe
function initializeDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            modules TEXT,
            status TEXT DEFAULT 'active'
        );

        CREATE TABLE IF NOT EXISTS prestadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            razonSocial TEXT NOT NULL,
            cuit TEXT NOT NULL UNIQUE,
            nombreFantasia TEXT,
            fechaConvenio TEXT NOT NULL,
            provincia TEXT NOT NULL,
            referenteContrataciones TEXT NOT NULL,
            nroSSSalud TEXT,
            direccionLegal TEXT NOT NULL,
            email TEXT NOT NULL,
            telefono TEXT NOT NULL,
            estado TEXT DEFAULT 'activo',
            history TEXT
        );
        
        -- Aquí irían las otras tablas (autorizaciones, ordenes_pago, etc.)
    `);

    // Insertar usuario admin por defecto si no existe
    const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    if (!adminUser) {
        const adminPassword = hashPassword('password');
        db.prepare('INSERT INTO users (username, password, role, modules) VALUES (?, ?, ?, ?)')
          .run('admin', adminPassword, 'admin', 'prestadores,ordenes-pago,admin-usuarios,autorizaciones');
    }
}

initializeDB();

module.exports = { db, hashPassword };
