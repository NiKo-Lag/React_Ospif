-- Este script de migración añade una columna a la tabla 'notifications'
-- para crear un vínculo directo con la autorización que generó la notificación.
-- Esto facilitará futuras funcionalidades, como la navegación directa desde
-- una notificación a la solicitud correspondiente.

ALTER TABLE notifications
ADD COLUMN related_authorization_id INTEGER,
ADD CONSTRAINT fk_authorizations
    FOREIGN KEY (related_authorization_id)
    REFERENCES authorizations(id)
    ON DELETE SET NULL; -- Si se elimina la autorización, el enlace en la notificación se vuelve nulo.

-- NOTA: Ejecuta este script para actualizar tu esquema de base de datos. 