-- Actualizar tabla companies con campos adicionales
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_type VARCHAR CHECK (company_type IN ('cliente', 'constructora', 'interventora', 'supervisora')),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR,
ADD COLUMN IF NOT EXISTS contact_person VARCHAR,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR,
ADD COLUMN IF NOT EXISTS contact_email VARCHAR,
ADD COLUMN IF NOT EXISTS website VARCHAR,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar empresas existentes para que tengan is_active = true por defecto
UPDATE public.companies SET is_active = true WHERE is_active IS NULL;

-- Comentarios sobre los campos
COMMENT ON COLUMN public.companies.company_type IS 'Tipo de empresa: cliente, constructora, interventora, supervisora';
COMMENT ON COLUMN public.companies.logo_url IS 'URL del logo de la empresa almacenado en Supabase Storage';
COMMENT ON COLUMN public.companies.city IS 'Ciudad donde está ubicada la empresa';
COMMENT ON COLUMN public.companies.contact_person IS 'Persona de contacto operativo';
COMMENT ON COLUMN public.companies.contact_phone IS 'Teléfono de contacto operativo';
COMMENT ON COLUMN public.companies.contact_email IS 'Email de contacto operativo';
COMMENT ON COLUMN public.companies.website IS 'Sitio web de la empresa';
COMMENT ON COLUMN public.companies.is_active IS 'Indica si la empresa está activa en el sistema';
