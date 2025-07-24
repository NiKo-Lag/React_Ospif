-- migration_create_field_audits_table.sql

CREATE TABLE field_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internment_id INTEGER NOT NULL,
    assigned_auditor_id INTEGER NOT NULL,
    requester_operator_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Completada', 'Cancelada'
    visit_date DATETIME,
    observations TEXT,
    checklist_data TEXT, -- Usamos TEXT para almacenar JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (internment_id) REFERENCES internments(id),
    FOREIGN KEY (assigned_auditor_id) REFERENCES users(id),
    FOREIGN KEY (requester_operator_id) REFERENCES users(id)
); 