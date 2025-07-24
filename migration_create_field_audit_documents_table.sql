-- migration_create_field_audit_documents_table.sql

CREATE TABLE field_audit_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_audit_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (field_audit_id) REFERENCES field_audits(id) ON DELETE CASCADE
); 