-- =====================================================
-- MIGRACIÓN 084: PLANTILLAS DE EMAIL
-- =====================================================
-- Módulo para gestionar plantillas HTML de correo

-- 1. Tabla de plantillas de email
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(100) NOT NULL,
  template_name VARCHAR(150) NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_type
  ON email_templates(template_type);

-- 2. Permisos para el módulo
INSERT INTO role_permissions (role, module, action, allowed)
VALUES
  ('super_admin', 'plantillas_email', 'create', true),
  ('super_admin', 'plantillas_email', 'read', true),
  ('super_admin', 'plantillas_email', 'update', true),
  ('super_admin', 'plantillas_email', 'delete', true),
  ('admin', 'plantillas_email', 'create', true),
  ('admin', 'plantillas_email', 'read', true),
  ('admin', 'plantillas_email', 'update', true),
  ('admin', 'plantillas_email', 'delete', true)
ON CONFLICT (role, module, action)
DO UPDATE SET allowed = EXCLUDED.allowed;

-- 3. RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email templates" ON email_templates;
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 4. Plantillas por defecto
INSERT INTO email_templates (template_type, template_name, subject, html_content, variables, is_active)
VALUES
  (
    'welcome_user',
    'Bienvenida de Usuario',
    'Bienvenido(a) a Talento Inmobiliario',
    '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #0f766e;">Bienvenido(a), {{full_name}} 👋</h2>
      <p>Tu cuenta ha sido creada en Talento Inmobiliario.</p>
      <p><strong>Proyecto:</strong> {{project_name}}</p>
      <p><strong>Empresa:</strong> {{company_name}}</p>
      <p>Ya puedes ingresar con tu correo <strong>{{email}}</strong> desde:</p>
      <p><a href="{{login_url}}" style="color: #0f766e;">{{login_url}}</a></p>
      <p>Si tienes dudas, responde a este correo.</p>
    </div>',
    '["full_name", "email", "company_name", "project_name", "login_url"]'::jsonb,
    true
  ),
  (
    'project_activated',
    'Activación de Proyecto',
    'Proyecto activado: {{project_name}}',
    '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #0f766e;">Proyecto activado</h2>
      <p>El proyecto <strong>{{project_name}}</strong> ya se encuentra activo en Talento Inmobiliario.</p>
      <p><strong>Empresa:</strong> {{company_name}}</p>
      <p>Accede aquí: <a href="{{login_url}}" style="color: #0f766e;">{{login_url}}</a></p>
    </div>',
    '["company_name", "project_name", "login_url"]'::jsonb,
    true
  ),
  (
    'company_activated',
    'Activación de Empresa',
    'Empresa activada: {{company_name}}',
    '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #0f766e;">Empresa activada</h2>
      <p>Tu empresa <strong>{{company_name}}</strong> ya está activa en Talento Inmobiliario.</p>
      <p>Accede aquí: <a href="{{login_url}}" style="color: #0f766e;">{{login_url}}</a></p>
    </div>',
    '["company_name", "login_url"]'::jsonb,
    true
  ),
  (
    'biweekly_report_submitted',
    'Informe enviado para revisión',
    'Informe quincenal enviado para revisión ({{project_name}})',
    '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #0f766e;">Informe enviado para revisión</h2>
      <p>El residente envió el informe {{report_number}} del proyecto <strong>{{project_name}}</strong> para revisión.</p>
      <p>Ingresa al panel para revisarlo.</p>
      <p><a href="{{login_url}}" style="color: #0f766e;">{{login_url}}</a></p>
    </div>',
    '["project_name", "report_number", "login_url"]'::jsonb,
    true
  )
ON CONFLICT (template_type)
DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

COMMENT ON TABLE email_templates IS 'Plantillas HTML de correo para eventos del sistema';
