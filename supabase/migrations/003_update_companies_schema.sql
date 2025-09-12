-- Actualizar esquema de empresas con campos mejorados
-- Ejecutar después de las migraciones 001 y 002

-- Agregar nuevos campos a la tabla companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_type VARCHAR CHECK (company_type IN ('cliente', 'constructora', 'interventora', 'supervisora')),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR,
ADD COLUMN IF NOT EXISTS contact_person VARCHAR,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR,
ADD COLUMN IF NOT EXISTS contact_email VARCHAR,
ADD COLUMN IF NOT EXISTS website VARCHAR,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Crear índice para búsquedas por tipo de empresa
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_active ON public.companies(is_active);

-- Actualizar políticas RLS para incluir nuevos campos
-- Las políticas existentes ya cubren la tabla companies

-- Insertar datos de ejemplo para testing
INSERT INTO public.companies (
  name, 
  nit, 
  company_type,
  address, 
  city,
  phone, 
  email, 
  legal_representative,
  contact_person,
  contact_phone,
  contact_email,
  website,
  is_active
) VALUES 
(
  'Constructora ABC S.A.S',
  '900123456-1',
  'constructora',
  'Carrera 15 #93-47, Bogotá',
  'Bogotá D.C.',
  '+57 1 234 5678',
  'info@constructoraabc.com',
  'Juan Pérez',
  'María García',
  '+57 300 123 4567',
  'maria@constructoraabc.com',
  'https://www.constructoraabc.com',
  true
),
(
  'Inmobiliaria XYZ Ltda',
  '900987654-3',
  'cliente',
  'Calle 80 #12-34, Medellín',
  'Medellín',
  '+57 4 567 8901',
  'contacto@inmobiliariaxyz.com',
  'Ana López',
  'Carlos Ruiz',
  '+57 300 987 6543',
  'carlos@inmobiliariaxyz.com',
  'https://www.inmobiliariaxyz.com',
  true
) ON CONFLICT (nit) DO NOTHING;

-- Comentarios:
-- 1. Los nuevos campos están listos para usar
-- 2. Se crearon índices para optimizar consultas
-- 3. Se insertaron datos de ejemplo para testing
-- 4. El bucket 'company-logos' debe crearse manualmente en Supabase Storage
