-- Migración para agregar campo de tiempo configurable para cotizaciones
-- Fecha: 2024-12-19

-- Agregar campo para tiempo configurable de cotización (en horas hábiles)
ALTER TABLE medication_requests 
ADD COLUMN quotation_deadline_hours INTEGER DEFAULT 48;

-- Agregar constraint para asegurar valores válidos
ALTER TABLE medication_requests 
ADD CONSTRAINT check_quotation_deadline_hours 
CHECK (quotation_deadline_hours IN (24, 48, 72, 96, 120));

-- Comentario para documentar el campo
COMMENT ON COLUMN medication_requests.quotation_deadline_hours IS 'Tiempo límite configurable para cotizaciones en horas hábiles (24, 48, 72, 96, 120)';

-- Actualizar registros existentes para tener un valor por defecto
UPDATE medication_requests 
SET quotation_deadline_hours = 48 
WHERE quotation_deadline_hours IS NULL; 