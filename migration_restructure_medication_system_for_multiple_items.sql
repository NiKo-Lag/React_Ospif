-- migration_restructure_medication_system_for_multiple_items.sql
-- Script de migración para reestructurar el sistema de medicación para soportar múltiples items por orden

-- 1. Crear nueva tabla de órdenes médicas (medication_orders)
CREATE TABLE medication_orders (
    id SERIAL PRIMARY KEY,
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
    details JSONB -- Para datos adicionales flexibles
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_orders IS 'Órdenes médicas que pueden contener múltiples medicamentos';
COMMENT ON COLUMN medication_orders.beneficiary_name IS 'Nombre del beneficiario';
COMMENT ON COLUMN medication_orders.beneficiary_cuil IS 'CUIT del beneficiario';
COMMENT ON COLUMN medication_orders.diagnosis IS 'Diagnóstico principal';
COMMENT ON COLUMN medication_orders.requesting_doctor IS 'Médico solicitante';
COMMENT ON COLUMN medication_orders.urgency_level IS 'Nivel de urgencia de la orden completa';
COMMENT ON COLUMN medication_orders.status IS 'Estado actual de la orden en el flujo de trabajo';

-- 2. Crear tabla de items de medicación (medication_order_items)
CREATE TABLE medication_order_items (
    id SERIAL PRIMARY KEY,
    medication_order_id INTEGER NOT NULL REFERENCES medication_orders(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'unidades', 'comprimidos', 'ml', etc.
    special_instructions TEXT, -- Instrucciones específicas para este medicamento
    priority INTEGER DEFAULT 1, -- Prioridad del item (1 = más alta)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_order_items IS 'Items individuales de medicación dentro de una orden';
COMMENT ON COLUMN medication_order_items.medication_name IS 'Nombre del medicamento';
COMMENT ON COLUMN medication_order_items.dosage IS 'Dosis prescrita (ej: 500mg cada 8 horas)';
COMMENT ON COLUMN medication_order_items.unit IS 'Unidad de medida (unidades, comprimidos, ml, etc.)';
COMMENT ON COLUMN medication_order_items.special_instructions IS 'Instrucciones específicas para este medicamento';
COMMENT ON COLUMN medication_order_items.priority IS 'Prioridad del item (1 = más alta)';

-- 3. Modificar tabla de cotizaciones para referenciar items (medication_quotations)
-- Primero renombramos la tabla existente como backup
ALTER TABLE medication_quotations RENAME TO medication_quotations_backup;

-- Crear nueva tabla de cotizaciones
CREATE TABLE medication_quotations (
    id SERIAL PRIMARY KEY,
    medication_order_item_id INTEGER NOT NULL REFERENCES medication_order_items(id) ON DELETE CASCADE,
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
COMMENT ON TABLE medication_quotations IS 'Cotizaciones por item de medicación enviadas por las droguerías';
COMMENT ON COLUMN medication_quotations.medication_order_item_id IS 'Referencia al item específico de la orden';
COMMENT ON COLUMN medication_quotations.unit_price IS 'Precio por unidad del medicamento';
COMMENT ON COLUMN medication_quotations.total_price IS 'Precio total de la cotización para este item';
COMMENT ON COLUMN medication_quotations.availability IS 'Disponibilidad del medicamento';
COMMENT ON COLUMN medication_quotations.token IS 'Token único para acceso seguro al formulario de cotización';

-- 4. Renombrar tabla de archivos adjuntos (medication_order_attachments)
ALTER TABLE medication_request_attachments RENAME TO medication_order_attachments;
ALTER TABLE medication_order_attachments RENAME COLUMN medication_request_id TO medication_order_id;

-- Actualizar la referencia en la tabla de archivos adjuntos
ALTER TABLE medication_order_attachments 
DROP CONSTRAINT IF EXISTS medication_request_attachments_medication_request_id_fkey;

ALTER TABLE medication_order_attachments 
ADD CONSTRAINT medication_order_attachments_medication_order_id_fkey 
FOREIGN KEY (medication_order_id) REFERENCES medication_orders(id) ON DELETE CASCADE;

-- Comentarios para documentar la tabla
COMMENT ON TABLE medication_order_attachments IS 'Archivos adjuntos a las órdenes de medicación';

-- 5. Eliminar tabla antigua (medication_requests)
DROP TABLE IF EXISTS medication_requests;

-- 6. Índices para optimizar consultas
CREATE INDEX idx_medication_orders_status ON medication_orders(status);
CREATE INDEX idx_medication_orders_created_by ON medication_orders(created_by);
CREATE INDEX idx_medication_orders_created_at ON medication_orders(created_at);
CREATE INDEX idx_medication_orders_beneficiary_cuil ON medication_orders(beneficiary_cuil);

CREATE INDEX idx_medication_order_items_order_id ON medication_order_items(medication_order_id);
CREATE INDEX idx_medication_order_items_priority ON medication_order_items(priority);

CREATE INDEX idx_medication_quotations_item_id ON medication_quotations(medication_order_item_id);
CREATE INDEX idx_medication_quotations_pharmacy_id ON medication_quotations(pharmacy_id);
CREATE INDEX idx_medication_quotations_token ON medication_quotations(token);
CREATE INDEX idx_medication_quotations_status ON medication_quotations(status);

CREATE INDEX idx_medication_order_attachments_order_id ON medication_order_attachments(medication_order_id);

-- 7. Constraints de validación
ALTER TABLE medication_quotations 
ADD CONSTRAINT check_total_price 
CHECK (total_price >= 0);

ALTER TABLE medication_order_items 
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity > 0);

ALTER TABLE medication_order_items 
ADD CONSTRAINT check_priority_positive 
CHECK (priority > 0);

ALTER TABLE medication_orders 
ADD CONSTRAINT check_urgency_level 
CHECK (urgency_level IN ('Normal', 'Urgente', 'Crítica'));

ALTER TABLE medication_orders 
ADD CONSTRAINT check_order_status 
CHECK (status IN ('Creada', 'En Cotización', 'Pendiente de Revisión', 'Autorizada', 'Rechazada'));

ALTER TABLE medication_quotations 
ADD CONSTRAINT check_quotation_status 
CHECK (status IN ('Pendiente', 'Cotizada', 'Seleccionada', 'Rechazada'));

ALTER TABLE medication_quotations 
ADD CONSTRAINT check_availability 
CHECK (availability IN ('Inmediata', '24hs', '48hs', '1 semana', 'No disponible'));

-- 8. Función para obtener el resumen de cotizaciones por orden
CREATE OR REPLACE FUNCTION get_order_quotations_summary(order_id INTEGER)
RETURNS TABLE(
    total_items INTEGER,
    items_with_quotations INTEGER,
    completed_quotations INTEGER,
    min_total_price DECIMAL(10,2),
    max_total_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT moi.id)::INTEGER as total_items,
        COUNT(DISTINCT CASE WHEN mq.id IS NOT NULL THEN moi.id END)::INTEGER as items_with_quotations,
        COUNT(DISTINCT CASE WHEN mq.status = 'Cotizada' THEN moi.id END)::INTEGER as completed_quotations,
        MIN(mq.total_price) as min_total_price,
        MAX(mq.total_price) as max_total_price
    FROM medication_order_items moi
    LEFT JOIN medication_quotations mq ON moi.id = mq.medication_order_item_id
    WHERE moi.medication_order_id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Comentario para la función
COMMENT ON FUNCTION get_order_quotations_summary(INTEGER) IS 'Obtiene un resumen de las cotizaciones para una orden específica';

-- NOTA: Este script reestructura completamente el sistema de medicación para soportar múltiples items por orden.
-- Después de ejecutar, verifica que todas las tablas se hayan creado correctamente.
-- La tabla medication_quotations_backup se puede eliminar después de verificar que la migración fue exitosa. 