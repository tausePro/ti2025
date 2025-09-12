-- Talento Inmobiliario - Migración a sistema de permisos granulares
-- Basado en propuesta de Opus con adaptaciones para nuestro contexto

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.user_custom_permissions CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Tabla de usuarios extendida (extiende auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'gerente', 'supervisor', 'residente', 'cliente')),
  signature_url TEXT, -- URL de la imagen de firma
  professional_license TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de permisos granulares por rol
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL,
  module TEXT NOT NULL, -- 'projects', 'reports', 'financial', 'users', 'companies', 'bitacora'
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve', 'sign', 'assign'
  allowed BOOLEAN DEFAULT false,
  UNIQUE(role, module, action)
);

-- 3. Permisos personalizados por usuario (sobrescriben los del rol)
CREATE TABLE public.user_custom_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Permisos específicos por proyecto
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module, action, project_id)
);

-- 4. Actualizar tabla de empresas (mantener estructura existente)
-- La tabla companies ya existe, solo agregamos campos si no existen
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 5. Actualizar tabla de proyectos (mantener estructura existente + mejoras)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Actualizar constraint de status para incluir nuevos valores
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('activo', 'pausado', 'finalizado'));

-- 6. Nueva tabla de asignación de usuarios a proyectos (reemplaza project_teams)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL CHECK (role_in_project IN ('supervisor', 'residente', 'apoyo', 'cliente')),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, user_id, role_in_project)
);

-- Insertar permisos por defecto para cada rol

-- Permisos para Super Admin (todo permitido)
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('super_admin', 'projects', 'create', true),
('super_admin', 'projects', 'read', true),
('super_admin', 'projects', 'update', true),
('super_admin', 'projects', 'delete', true),
('super_admin', 'projects', 'assign', true),
('super_admin', 'reports', 'create', true),
('super_admin', 'reports', 'read', true),
('super_admin', 'reports', 'update', true),
('super_admin', 'reports', 'delete', true),
('super_admin', 'reports', 'approve', true),
('super_admin', 'reports', 'sign', true),
('super_admin', 'financial', 'create', true),
('super_admin', 'financial', 'read', true),
('super_admin', 'financial', 'update', true),
('super_admin', 'financial', 'delete', true),
('super_admin', 'users', 'create', true),
('super_admin', 'users', 'read', true),
('super_admin', 'users', 'update', true),
('super_admin', 'users', 'delete', true),
('super_admin', 'companies', 'create', true),
('super_admin', 'companies', 'read', true),
('super_admin', 'companies', 'update', true),
('super_admin', 'companies', 'delete', true),
('super_admin', 'bitacora', 'create', true),
('super_admin', 'bitacora', 'read', true),
('super_admin', 'bitacora', 'update', true),
('super_admin', 'bitacora', 'delete', true);

-- Permisos para Admin (similar a super_admin pero sin delete críticos)
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('admin', 'projects', 'create', true),
('admin', 'projects', 'read', true),
('admin', 'projects', 'update', true),
('admin', 'projects', 'delete', true),
('admin', 'projects', 'assign', true),
('admin', 'reports', 'create', true),
('admin', 'reports', 'read', true),
('admin', 'reports', 'update', true),
('admin', 'reports', 'delete', false),
('admin', 'reports', 'approve', true),
('admin', 'reports', 'sign', true),
('admin', 'financial', 'create', true),
('admin', 'financial', 'read', true),
('admin', 'financial', 'update', true),
('admin', 'financial', 'delete', false),
('admin', 'users', 'create', true),
('admin', 'users', 'read', true),
('admin', 'users', 'update', true),
('admin', 'users', 'delete', false),
('admin', 'companies', 'create', true),
('admin', 'companies', 'read', true),
('admin', 'companies', 'update', true),
('admin', 'companies', 'delete', false),
('admin', 'bitacora', 'create', true),
('admin', 'bitacora', 'read', true),
('admin', 'bitacora', 'update', true),
('admin', 'bitacora', 'delete', false);

-- Permisos para Gerente
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('gerente', 'projects', 'create', true),
('gerente', 'projects', 'read', true),
('gerente', 'projects', 'update', true),
('gerente', 'projects', 'delete', false),
('gerente', 'projects', 'assign', true),
('gerente', 'reports', 'create', false),
('gerente', 'reports', 'read', true),
('gerente', 'reports', 'update', false),
('gerente', 'reports', 'approve', true),
('gerente', 'reports', 'sign', true),
('gerente', 'financial', 'read', true),
('gerente', 'financial', 'update', true),
('gerente', 'users', 'read', true),
('gerente', 'users', 'update', false),
('gerente', 'companies', 'read', true),
('gerente', 'bitacora', 'read', true);

-- Permisos para Supervisor
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('supervisor', 'projects', 'read', true),
('supervisor', 'reports', 'create', true),
('supervisor', 'reports', 'read', true),
('supervisor', 'reports', 'update', true),
('supervisor', 'reports', 'approve', true),
('supervisor', 'reports', 'sign', true),
('supervisor', 'financial', 'read', true),
('supervisor', 'bitacora', 'create', true),
('supervisor', 'bitacora', 'read', true),
('supervisor', 'bitacora', 'update', true);

-- Permisos para Residente
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('residente', 'projects', 'read', true), -- solo sus proyectos
('residente', 'reports', 'create', true),
('residente', 'reports', 'read', true), -- solo sus reportes
('residente', 'reports', 'update', true), -- solo en estado borrador
('residente', 'reports', 'sign', true),
('residente', 'bitacora', 'create', true),
('residente', 'bitacora', 'read', true),
('residente', 'bitacora', 'update', true);

-- Permisos para Cliente
INSERT INTO public.role_permissions (role, module, action, allowed) VALUES
('cliente', 'projects', 'read', true), -- solo sus proyectos
('cliente', 'reports', 'read', true), -- solo reportes aprobados
('cliente', 'financial', 'read', true), -- solo de sus proyectos
('cliente', 'bitacora', 'read', true); -- solo bitácoras de sus proyectos

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- Políticas RLS para companies
CREATE POLICY "Admins can manage companies" 
ON public.companies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Políticas RLS para projects
CREATE POLICY "Users can view their assigned projects" 
ON public.projects FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

CREATE POLICY "Admins can manage projects" 
ON public.projects FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Políticas RLS para project_members
CREATE POLICY "Users can view project members of their projects" 
ON public.project_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm2
    WHERE pm2.project_id = project_members.project_id 
    AND pm2.user_id = auth.uid() 
    AND pm2.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

-- Políticas RLS para daily_logs
CREATE POLICY "Users can view logs of their projects" 
ON public.daily_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = daily_logs.project_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'gerente')
  )
);

CREATE POLICY "Residents and supervisors can create logs" 
ON public.daily_logs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = daily_logs.project_id 
    AND user_id = auth.uid() 
    AND role_in_project IN ('residente', 'supervisor')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- Función helper para verificar permisos
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_module TEXT,
  p_action TEXT,
  p_project_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_has_permission BOOLEAN;
  v_custom_permission BOOLEAN;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO v_user_role 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Si no existe el usuario, denegar acceso
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar permisos personalizados primero (específicos por proyecto)
  IF p_project_id IS NOT NULL THEN
    SELECT allowed INTO v_custom_permission
    FROM public.user_custom_permissions
    WHERE user_id = p_user_id 
    AND module = p_module 
    AND action = p_action
    AND project_id = p_project_id;
    
    IF v_custom_permission IS NOT NULL THEN
      RETURN v_custom_permission;
    END IF;
  END IF;
  
  -- Verificar permisos personalizados generales
  SELECT allowed INTO v_custom_permission
  FROM public.user_custom_permissions
  WHERE user_id = p_user_id 
  AND module = p_module 
  AND action = p_action
  AND project_id IS NULL;
  
  IF v_custom_permission IS NOT NULL THEN
    RETURN v_custom_permission;
  END IF;
  
  -- Verificar permisos del rol
  SELECT allowed INTO v_has_permission
  FROM public.role_permissions
  WHERE role = v_user_role 
  AND module = p_module 
  AND action = p_action;
  
  -- Si es un proyecto específico, verificar membresía para roles no administrativos
  IF p_project_id IS NOT NULL AND v_has_permission = true THEN
    IF v_user_role NOT IN ('super_admin', 'admin', 'gerente') THEN
      RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
        AND is_active = true
      );
    END IF;
  END IF;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(module TEXT, action TEXT, allowed BOOLEAN, source TEXT) AS $$
BEGIN
  RETURN QUERY
  WITH user_role AS (
    SELECT role FROM public.profiles WHERE id = p_user_id
  ),
  role_perms AS (
    SELECT rp.module, rp.action, rp.allowed, 'role' as source
    FROM public.role_permissions rp, user_role ur
    WHERE rp.role = ur.role
  ),
  custom_perms AS (
    SELECT ucp.module, ucp.action, ucp.allowed, 'custom' as source
    FROM public.user_custom_permissions ucp
    WHERE ucp.user_id = p_user_id AND ucp.project_id IS NULL
  )
  SELECT 
    COALESCE(cp.module, rp.module) as module,
    COALESCE(cp.action, rp.action) as action,
    COALESCE(cp.allowed, rp.allowed) as allowed,
    COALESCE(cp.source, rp.source) as source
  FROM role_perms rp
  FULL OUTER JOIN custom_perms cp ON rp.module = cp.module AND rp.action = cp.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear índices para optimizar consultas
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_role_permissions_lookup ON public.role_permissions(role, module, action);
CREATE INDEX idx_user_custom_permissions_lookup ON public.user_custom_permissions(user_id, module, action);
CREATE INDEX idx_project_members_user_project ON public.project_members(user_id, project_id, is_active);
CREATE INDEX idx_daily_logs_project_date ON public.daily_logs(project_id, date);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
