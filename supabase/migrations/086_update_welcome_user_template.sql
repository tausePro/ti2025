-- =====================================================
-- MIGRACIÓN 086: ACTUALIZAR PLANTILLA WELCOME_USER
-- Incluye rol y enlace para crear contraseña
-- =====================================================

BEGIN;

UPDATE email_templates
SET
  subject = 'Bienvenido(a) a Talento Inmobiliario',
  html_content = '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
  <h2 style="color: #0f766e;">Bienvenido(a), {{full_name}} 👋</h2>
  <p>Tu cuenta ha sido creada en Talento Inmobiliario.</p>
  <p><strong>Rol:</strong> {{role}}</p>
  <p><strong>Proyecto:</strong> {{project_name}}</p>
  <p><strong>Empresa:</strong> {{company_name}}</p>
  <p>Para activar tu acceso, crea tu contraseña aquí:</p>
  <p><a href="{{set_password_url}}" style="color: #0f766e; font-weight: 600;">Crear contraseña</a></p>
  <p>Luego podrás ingresar desde:</p>
  <p><a href="{{login_url}}" style="color: #0f766e;">{{login_url}}</a></p>
  <p>Si tienes dudas, responde a este correo.</p>
</div>',
  variables = '["full_name", "email", "company_name", "project_name", "login_url", "role", "set_password_url"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'welcome_user';

COMMIT;
