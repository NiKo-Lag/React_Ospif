-- migration_add_is_urgent_to_field_audits.sql
-- Añade la columna is_urgent a la tabla field_audits

ALTER TABLE field_audits 
ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

-- Añadir comentario para documentar el propósito de la columna
COMMENT ON COLUMN field_audits.is_urgent IS 'Indica si la auditoría de terreno es urgente y requiere atención inmediata'; 