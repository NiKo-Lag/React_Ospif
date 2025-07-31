-- Migración para crear la tabla beneficiary_profiles
-- Esta tabla almacena datos adicionales del perfil del beneficiario

CREATE TABLE IF NOT EXISTS beneficiary_profiles (
    id SERIAL PRIMARY KEY,
    beneficiary_cuil VARCHAR(11) NOT NULL UNIQUE,
    internal_profile TEXT,
    chronic_conditions JSONB DEFAULT '[]',
    chronic_medication JSONB DEFAULT '[]',
    alerts TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por CUIL
CREATE INDEX IF NOT EXISTS idx_beneficiary_profiles_cuil ON beneficiary_profiles(beneficiary_cuil);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beneficiary_profiles_updated_at 
    BEFORE UPDATE ON beneficiary_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos datos de ejemplo
INSERT INTO beneficiary_profiles (beneficiary_cuil, internal_profile, chronic_conditions, chronic_medication, alerts) 
VALUES 
    ('20404803574', 'Paciente con hipertensión arterial crónica. Requiere control periódico de presión y medicación regular (Losartan). Alergia a la penicilina.', 
     '["Hipertensión Arterial", "Alergia a Penicilina"]', 
     '["Losartan 50mg", "Aspirina Prevent 100mg"]', 
     'Paciente requiere seguimiento especial por hipertensión'),
    ('27954567891', '', '[]', '[]', '')
ON CONFLICT (beneficiary_cuil) DO NOTHING; 