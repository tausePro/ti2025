-- MIGRACIÓN: Sistema de Administración de Estilos
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla para configuración de estilos
CREATE TABLE IF NOT EXISTS style_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  
  -- Colores principales
  primary_color TEXT NOT NULL DEFAULT '#000000',
  primary_foreground TEXT NOT NULL DEFAULT '#ffffff',
  secondary_color TEXT NOT NULL DEFAULT '#f1f5f9',
  secondary_foreground TEXT NOT NULL DEFAULT '#0f172a',
  
  -- Colores de acento
  accent_color TEXT NOT NULL DEFAULT '#f1f5f9',
  accent_foreground TEXT NOT NULL DEFAULT '#0f172a',
  
  -- Colores de estado
  success_color TEXT NOT NULL DEFAULT '#22c55e',
  warning_color TEXT NOT NULL DEFAULT '#f59e0b',
  error_color TEXT NOT NULL DEFAULT '#ef4444',
  info_color TEXT NOT NULL DEFAULT '#3b82f6',
  
  -- Colores de fondo
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  foreground_color TEXT NOT NULL DEFAULT '#0f172a',
  card_background TEXT NOT NULL DEFAULT '#ffffff',
  card_foreground TEXT NOT NULL DEFAULT '#0f172a',
  
  -- Colores de borde
  border_color TEXT NOT NULL DEFAULT '#e2e8f0',
  input_color TEXT NOT NULL DEFAULT '#e2e8f0',
  ring_color TEXT NOT NULL DEFAULT '#0f172a',
  
  -- Configuración de branding
  logo_url TEXT,
  favicon_url TEXT,
  company_name TEXT,
  company_slogan TEXT,
  
  -- Configuración de tipografía
  font_family TEXT DEFAULT 'Inter',
  font_size_base TEXT DEFAULT '16px',
  font_weight_normal TEXT DEFAULT '400',
  font_weight_medium TEXT DEFAULT '500',
  font_weight_semibold TEXT DEFAULT '600',
  font_weight_bold TEXT DEFAULT '700',
  
  -- Configuración de espaciado
  border_radius TEXT DEFAULT '0.5rem',
  spacing_unit TEXT DEFAULT '0.25rem',
  
  -- Configuración de sombras
  shadow_sm TEXT DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  shadow_md TEXT DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  shadow_lg TEXT DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Restricciones
  CONSTRAINT valid_hex_colors CHECK (
    primary_color ~ '^#[0-9A-Fa-f]{6}$' AND
    primary_foreground ~ '^#[0-9A-Fa-f]{6}$' AND
    secondary_color ~ '^#[0-9A-Fa-f]{6}$' AND
    secondary_foreground ~ '^#[0-9A-Fa-f]{6}$' AND
    accent_color ~ '^#[0-9A-Fa-f]{6}$' AND
    accent_foreground ~ '^#[0-9A-Fa-f]{6}$' AND
    success_color ~ '^#[0-9A-Fa-f]{6}$' AND
    warning_color ~ '^#[0-9A-Fa-f]{6}$' AND
    error_color ~ '^#[0-9A-Fa-f]{6}$' AND
    info_color ~ '^#[0-9A-Fa-f]{6}$' AND
    background_color ~ '^#[0-9A-Fa-f]{6}$' AND
    foreground_color ~ '^#[0-9A-Fa-f]{6}$' AND
    card_background ~ '^#[0-9A-Fa-f]{6}$' AND
    card_foreground ~ '^#[0-9A-Fa-f]{6}$' AND
    border_color ~ '^#[0-9A-Fa-f]{6}$' AND
    input_color ~ '^#[0-9A-Fa-f]{6}$' AND
    ring_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

-- 2. Crear tabla para assets de branding
CREATE TABLE IF NOT EXISTS branding_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_configuration_id UUID REFERENCES style_configurations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'favicon', 'banner', 'icon')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_style_configurations_active ON style_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_style_configurations_default ON style_configurations(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_branding_assets_config ON branding_assets(style_configuration_id);
CREATE INDEX IF NOT EXISTS idx_branding_assets_type ON branding_assets(asset_type);

-- 4. Habilitar RLS
ALTER TABLE style_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_assets ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para style_configurations
CREATE POLICY "Super admins can manage all style configurations" ON style_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage style configurations" ON style_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active style configurations" ON style_configurations
  FOR SELECT USING (is_active = true);

-- 6. Políticas RLS para branding_assets
CREATE POLICY "Super admins can manage all branding assets" ON branding_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage branding assets" ON branding_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view branding assets" ON branding_assets
  FOR SELECT USING (true);

-- 7. Crear configuración por defecto
INSERT INTO style_configurations (
  name,
  description,
  is_active,
  is_default,
  primary_color,
  primary_foreground,
  secondary_color,
  secondary_foreground,
  accent_color,
  accent_foreground,
  success_color,
  warning_color,
  error_color,
  info_color,
  background_color,
  foreground_color,
  card_background,
  card_foreground,
  border_color,
  input_color,
  ring_color,
  company_name,
  company_slogan,
  created_by
) VALUES (
  'Tema por Defecto',
  'Configuración de estilos predeterminada del sistema',
  true,
  true,
  '#000000',
  '#ffffff',
  '#f1f5f9',
  '#0f172a',
  '#f1f5f9',
  '#0f172a',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#ffffff',
  '#0f172a',
  '#ffffff',
  '#0f172a',
  '#e2e8f0',
  '#e2e8f0',
  '#0f172a',
  'Talento Inmobiliario',
  'Supervisión Técnica Profesional',
  (SELECT id FROM profiles WHERE email = 'admin@talentoinmobiliario.com' LIMIT 1)
);

-- 8. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_style_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para updated_at
CREATE TRIGGER update_style_configurations_updated_at
  BEFORE UPDATE ON style_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_style_configuration_updated_at();

-- 10. Función para desactivar otras configuraciones cuando se activa una
CREATE OR REPLACE FUNCTION deactivate_other_style_configurations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE style_configurations 
    SET is_active = false 
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para desactivar otras configuraciones
CREATE TRIGGER deactivate_other_style_configurations_trigger
  AFTER UPDATE ON style_configurations
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_style_configurations();

-- 12. Verificar que todo funciona
SELECT 'Style administration system created successfully!' as status;
