-- Este script de migración introduce un tipo ENUM para los estados de internación
-- Versión 3: Corrige el error de casteo de valores existentes (ej. 'Activa' vs 'ACTIVA').

-- ---
-- NOTA IMPORTANTE ANTES DE EJECUTAR:
-- Este script asume que los PASOS 1 y 2 del script anterior (V2) ya se ejecutaron con éxito.
-- Es decir, el tipo 'internment_status' ya existe y la columna 'status' ya no tiene un valor DEFAULT.
-- Si tienes dudas, ejecuta primero 'ALTER TABLE internments ALTER COLUMN status DROP DEFAULT;' para asegurarte.
-- ---

-- PASO 3 (CORREGIDO): Alterar la tabla 'internments' para usar el nuevo tipo ENUM.
-- Se normalizan los valores existentes a mayúsculas ANTES de convertirlos al tipo ENUM.
ALTER TABLE internments
ALTER COLUMN status TYPE internment_status
USING UPPER(status)::internment_status;

-- PASO 4: Re-establecer el valor por defecto, ahora usando el tipo ENUM correcto.
-- (Este paso es el mismo que en V2, pero se incluye para completar el proceso).
ALTER TABLE internments
ALTER COLUMN status SET DEFAULT 'INICIADA'::internment_status;

-- Si la ejecución es exitosa, la columna 'status' ahora será del tipo ENUM 'internment_status'. 