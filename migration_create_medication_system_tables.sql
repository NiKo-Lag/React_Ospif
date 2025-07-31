-- migration_create_medication_system_tables.sql
-- Script de migración para crear el sistema completo de solicitudes de medicación

-- 1. Tabla de droguerías (pharmacies)
CREATE TABLE pharmacies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cuit VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE pharmacies IS 'Catálogo de droguerías disponibles para cotizaciones';
COMMENT ON COLUMN pharmacies.name IS 'Nombre comercial de la droguería';
COMMENT ON COLUMN pharmacies.cuit IS 'CUIT único de la droguería';
COMMENT ON COLUMN pharmacies.email IS 'Email principal para envío de cotizaciones';
COMMENT ON COLUMN pharmacies.contact_person IS 'Persona de contacto principal';

-- 2. Tabla de solicitudes de medicación (medication_requests)
CREATE TABLE medication_requests (
    id SERIAL PRIMARY KEY,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'unidades', 'comprimidos', 'ml', etc.
    beneficiary_name VARCHAR(255) NOT NULL,
    beneficiary_cuil VARCHAR(20) NOT NULL,
    diagnosis TEXT NOT NULL,
    requesting_doctor VARCHAR(255) NOT NULL,
    urgency_level VARCHAR(50) NOT NULL DEFAULT 'Normal', -- 'Normal', 'Urgente', 'Crítica'
    special_observations TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Creada', -- 'Creada', 'En Cotización', 'Pendiente de Revisión', 'Autorizada', 'Rechazada'
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to_quotation_at TIMESTAMP WITH TIME ZONE,
    authorized_at TIMESTAMP WITH TIME ZONE,
    authorized_by INTEGER REFERENCES users(id),
    selected_quotation_id INTEGER, -- FK a medication_quotations
    details JSONB -- Para datos adicionales flexibles
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_requests IS 'Solicitudes principales de medicación';
COMMENT ON COLUMN medication_requests.medication_name IS 'Nombre del medicamento solicitado';
COMMENT ON COLUMN medication_requests.dosage IS 'Dosis prescrita (ej: 500mg cada 8 horas)';
COMMENT ON COLUMN medication_requests.unit IS 'Unidad de medida (unidades, comprimidos, ml, etc.)';
COMMENT ON COLUMN medication_requests.urgency_level IS 'Nivel de urgencia de la solicitud';
COMMENT ON COLUMN medication_requests.status IS 'Estado actual de la solicitud en el flujo de trabajo';
COMMENT ON COLUMN medication_requests.sent_to_quotation_at IS 'Fecha cuando se envió a cotización';
COMMENT ON COLUMN medication_requests.selected_quotation_id IS 'ID de la cotización seleccionada por el auditor';

-- 3. Tabla de cotizaciones de droguerías (medication_quotations)
CREATE TABLE medication_quotations (
    id SERIAL PRIMARY KEY,
    medication_request_id INTEGER NOT NULL REFERENCES medication_requests(id) ON DELETE CASCADE,
    pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    availability VARCHAR(50) NOT NULL, -- 'Inmediata', '24hs', '48hs', '1 semana', 'No disponible'
    delivery_time VARCHAR(100), -- 'Entrega en 24 horas', 'Retiro en sucursal', etc.
    commercial_conditions TEXT,
    observations TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Cotizada', 'Seleccionada', 'Rechazada'
    token VARCHAR(255) UNIQUE NOT NULL, -- Token único para acceso al formulario
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_quotations IS 'Cotizaciones enviadas por las droguerías';
COMMENT ON COLUMN medication_quotations.unit_price IS 'Precio por unidad del medicamento';
COMMENT ON COLUMN medication_quotations.total_price IS 'Precio total de la cotización';
COMMENT ON COLUMN medication_quotations.availability IS 'Disponibilidad del medicamento';
COMMENT ON COLUMN medication_quotations.token IS 'Token único para acceso seguro al formulario de cotización';
COMMENT ON COLUMN medication_quotations.token_expires_at IS 'Fecha de expiración del token de acceso';

-- 4. Tabla de archivos adjuntos (medication_request_attachments)
CREATE TABLE medication_request_attachments (
    id SERIAL PRIMARY KEY,
    medication_request_id INTEGER NOT NULL REFERENCES medication_requests(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_request_attachments IS 'Archivos adjuntos a las solicitudes de medicación';
COMMENT ON COLUMN medication_request_attachments.file_path IS 'Ruta del archivo en el sistema de almacenamiento';
COMMENT ON COLUMN medication_request_attachments.original_filename IS 'Nombre original del archivo subido';

-- Índices para optimizar consultas
CREATE INDEX idx_medication_requests_status ON medication_requests(status);
CREATE INDEX idx_medication_requests_created_by ON medication_requests(created_by);
CREATE INDEX idx_medication_requests_created_at ON medication_requests(created_at);
CREATE INDEX idx_medication_quotations_request_id ON medication_quotations(medication_request_id);
CREATE INDEX idx_medication_quotations_pharmacy_id ON medication_quotations(pharmacy_id);
CREATE INDEX idx_medication_quotations_token ON medication_quotations(token);
CREATE INDEX idx_medication_quotations_status ON medication_quotations(status);
CREATE INDEX idx_pharmacies_email ON pharmacies(email);
CREATE INDEX idx_pharmacies_active ON pharmacies(is_active);
CREATE INDEX idx_medication_attachments_request_id ON medication_request_attachments(medication_request_id);

-- Constraint para asegurar que el precio total sea consistente
ALTER TABLE medication_quotations 
ADD CONSTRAINT check_total_price 
CHECK (total_price >= 0);

-- Constraint para asegurar que la cantidad sea positiva
ALTER TABLE medication_requests 
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity > 0);

-- Constraint para asegurar que el nivel de urgencia sea válido
ALTER TABLE medication_requests 
ADD CONSTRAINT check_urgency_level 
CHECK (urgency_level IN ('Normal', 'Urgente', 'Crítica'));

-- Constraint para asegurar que el estado de la solicitud sea válido
ALTER TABLE medication_requests 
ADD CONSTRAINT check_request_status 
CHECK (status IN ('Creada', 'En Cotización', 'Pendiente de Revisión', 'Autorizada', 'Rechazada'));

-- Constraint para asegurar que el estado de la cotización sea válido
ALTER TABLE medication_quotations 
ADD CONSTRAINT check_quotation_status 
CHECK (status IN ('Pendiente', 'Cotizada', 'Seleccionada', 'Rechazada'));

-- Constraint para asegurar que la disponibilidad sea válida
ALTER TABLE medication_quotations 
ADD CONSTRAINT check_availability 
CHECK (availability IN ('Inmediata', '24hs', '48hs', '1 semana', 'No disponible'));

-- NOTA: Ejecuta este script para crear todas las tablas necesarias para el sistema de medicación.
-- Después de ejecutar, verifica que todas las tablas se hayan creado correctamente. 