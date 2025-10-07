-- MIGRACIÓN 011: Sistema de Métricas de Rendimiento y Roles por Empresa
-- Compatible con schema existente

-- 1. Sistema de Métricas de Rendimiento
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'page_load_time', 'api_response_time', 'error_rate',
    'user_session_duration', 'feature_usage', 'system_health'
  )),
  metric_name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT DEFAULT 'ms',
  company_id UUID REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para métricas
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_company ON performance_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_project ON performance_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- 3. Extender companies para configuración avanzada
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  custom_roles_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  max_users INTEGER DEFAULT 10;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  branding_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise'));

-- 4. Tabla para roles personalizados por empresa
CREATE TABLE IF NOT EXISTS company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL, -- 'project_viewer', 'document_manager', etc.
  role_display_name TEXT NOT NULL, -- 'Visor de Proyectos', 'Gestor de Documentos'
  permissions JSONB NOT NULL DEFAULT '[]', -- Array de permisos específicos
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(company_id, role_name)
);

-- 5. Tabla para permisos de usuarios en empresas específicas
CREATE TABLE IF NOT EXISTS user_company_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_role_id UUID REFERENCES company_roles(id) ON DELETE SET NULL,
  custom_permissions JSONB DEFAULT '{}', -- Permisos adicionales específicos del usuario
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),

  UNIQUE(user_id, company_id)
);

-- 6. Configuraciones de estilo por empresa (hereda de global)
CREATE TABLE IF NOT EXISTS company_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_config_id UUID REFERENCES style_configurations(id),
  overrides JSONB DEFAULT '{}', -- Solo campos que se modifican
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(company_id)
);

-- 7. Índices para roles y permisos
CREATE INDEX IF NOT EXISTS idx_company_roles_company ON company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_active ON company_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_company_permissions_user ON user_company_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_permissions_company ON user_company_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_configurations_company ON company_configurations(company_id);

-- 8. Habilitar RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_configurations ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para métricas
CREATE POLICY "Super admins can manage all metrics" ON performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Company users can view their company metrics" ON performance_metrics
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 10. Políticas RLS para company_roles
CREATE POLICY "Super admins can manage all company roles" ON company_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Company admins can manage their company roles" ON company_roles
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_permissions
      WHERE user_id = auth.uid()
      AND is_active = true
      AND custom_permissions->>'can_manage_roles' = 'true'
    )
  );

-- 11. Políticas RLS para user_company_permissions
CREATE POLICY "Super admins can manage all user permissions" ON user_company_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Company admins can manage their company user permissions" ON user_company_permissions
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_permissions ucp
      WHERE ucp.user_id = auth.uid()
      AND ucp.is_active = true
      AND ucp.custom_permissions->>'can_manage_users' = 'true'
    )
  );

CREATE POLICY "Users can view their own permissions" ON user_company_permissions
  FOR SELECT USING (user_id = auth.uid());

-- 12. Políticas RLS para company_configurations
CREATE POLICY "Super admins can manage all company configurations" ON company_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Company admins can manage their company configuration" ON company_configurations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_permissions
      WHERE user_id = auth.uid()
      AND is_active = true
      AND custom_permissions->>'can_manage_branding' = 'true'
    )
  );

CREATE POLICY "Company users can view their company configuration" ON company_configurations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 13. Funciones de utilidad
CREATE OR REPLACE FUNCTION get_user_company_permissions(user_uuid UUID)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  role_name TEXT,
  permissions JSONB,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    cr.role_name,
    cr.permissions,
    ucp.is_active
  FROM user_company_permissions ucp
  JOIN companies c ON ucp.company_id = c.id
  LEFT JOIN company_roles cr ON ucp.company_role_id = cr.id
  WHERE ucp.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Función para verificar permisos de usuario en empresa
CREATE OR REPLACE FUNCTION check_user_company_permission(
  user_uuid UUID,
  company_uuid UUID,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_permissions JSONB;
  has_permission BOOLEAN := false;
BEGIN
  -- Obtener permisos del usuario en la empresa
  SELECT
    COALESCE(cr.permissions, '{}'::jsonb) || COALESCE(ucp.custom_permissions, '{}'::jsonb)
  INTO user_role_permissions
  FROM user_company_permissions ucp
  LEFT JOIN company_roles cr ON ucp.company_role_id = cr.id
  WHERE ucp.user_id = user_uuid
    AND ucp.company_id = company_uuid
    AND ucp.is_active = true;

  -- Verificar si tiene el permiso requerido
  IF user_role_permissions ? required_permission THEN
    has_permission := user_role_permissions->>required_permission = 'true';
  END IF;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Trigger para actualizar métricas automáticamente
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar métrica de actividad
  INSERT INTO performance_metrics (
    metric_type,
    metric_name,
    value,
    company_id,
    user_id,
    metadata
  ) VALUES (
    'feature_usage',
    TG_TABLE_NAME || '_' || TG_OP,
    1,
    CASE
      WHEN TG_TABLE_NAME = 'projects' THEN NEW.client_company_id
      WHEN TG_TABLE_NAME = 'companies' THEN NEW.id
      ELSE NULL
    END,
    CASE
      WHEN TG_TABLE_NAME IN ('projects', 'companies') THEN NEW.created_by
      ELSE NULL
    END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', CASE
        WHEN TG_TABLE_NAME = 'projects' THEN NEW.id::text
        WHEN TG_TABLE_NAME = 'companies' THEN NEW.id::text
        ELSE NULL
      END
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Triggers para métricas automáticas
CREATE TRIGGER projects_performance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_performance_metrics();

CREATE TRIGGER companies_performance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_performance_metrics();

-- 17. Insertar roles por defecto para empresas cliente
INSERT INTO company_roles (
  company_id,
  role_name,
  role_display_name,
  permissions,
  is_default,
  created_by
)
SELECT
  c.id,
  'company_admin',
  'Administrador de Empresa',
  '{
    "can_manage_users": true,
    "can_manage_roles": true,
    "can_manage_branding": true,
    "can_view_analytics": true,
    "can_manage_projects": true,
    "can_approve_documents": true
  }'::jsonb,
  true,
  p.id
FROM companies c
CROSS JOIN profiles p
WHERE c.company_type = 'cliente'
  AND p.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM company_roles
    WHERE company_id = c.id AND role_name = 'company_admin'
  );

-- 18. Insertar roles por defecto para empresas constructoras
INSERT INTO company_roles (
  company_id,
  role_name,
  role_display_name,
  permissions,
  is_default,
  created_by
)
SELECT
  c.id,
  'project_manager',
  'Jefe de Proyecto',
  '{
    "can_manage_projects": true,
    "can_upload_documents": true,
    "can_view_reports": true,
    "can_submit_reports": true
  }'::jsonb,
  true,
  p.id
FROM companies c
CROSS JOIN profiles p
WHERE c.company_type = 'constructora'
  AND p.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM company_roles
    WHERE company_id = c.id AND role_name = 'project_manager'
  );

-- 19. Verificar que todo funciona
SELECT 'Performance and company roles system created successfully!' as status;