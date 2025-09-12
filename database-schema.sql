-- Talento Inmobiliario Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'gerente', 'supervisor', 'residente', 'cliente');
CREATE TYPE project_status AS ENUM ('planificacion', 'activo', 'pausado', 'completado', 'cancelado');
CREATE TYPE report_status AS ENUM ('borrador', 'pendiente_revision', 'aprobado', 'rechazado');
CREATE TYPE report_type AS ENUM ('quincenal', 'mensual', 'especial');
CREATE TYPE intervention_type AS ENUM ('tecnica', 'administrativa', 'integral');
CREATE TYPE payment_status AS ENUM ('pendiente', 'aprobado', 'pagado', 'rechazado');

-- Companies table
CREATE TABLE companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nit VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    legal_representative VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'residente',
    company_id UUID REFERENCES companies(id),
    phone VARCHAR(50),
    professional_license VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    intervention_type intervention_type[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'activo',
    custom_fields_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project team assignments
CREATE TABLE project_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

-- Daily logs (bitácoras)
CREATE TABLE daily_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    date DATE NOT NULL,
    weather VARCHAR(100),
    temperature VARCHAR(50),
    personnel_count INTEGER DEFAULT 0,
    activities TEXT,
    materials TEXT,
    equipment TEXT,
    observations TEXT,
    issues TEXT,
    recommendations TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, date, created_by)
);

-- Photos for daily logs
CREATE TABLE photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    daily_log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    tags TEXT[],
    description TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    taken_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type report_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content TEXT,
    summary TEXT,
    recommendations TEXT,
    status report_status DEFAULT 'borrador',
    pdf_path VARCHAR(500),
    created_by UUID REFERENCES users(id) NOT NULL,
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report signatures
CREATE TABLE report_signatures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) NOT NULL,
    signature_data TEXT, -- Base64 encoded signature
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Fiduciary accounts (for interventoría administrativa)
CREATE TABLE fiduciary_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment orders
CREATE TABLE payment_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    fiduciary_account_id UUID REFERENCES fiduciary_accounts(id),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    beneficiary VARCHAR(255) NOT NULL,
    concept TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status payment_status DEFAULT 'pendiente',
    requested_date DATE NOT NULL,
    approved_date DATE,
    paid_date DATE,
    supporting_documents TEXT[],
    created_by UUID REFERENCES users(id) NOT NULL,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Construction acts (actas de obra)
CREATE TABLE construction_acts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    act_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    accumulated_amount DECIMAL(15,2),
    percentage_complete DECIMAL(5,2),
    observations TEXT,
    status payment_status DEFAULT 'pendiente',
    created_by UUID REFERENCES users(id) NOT NULL,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, act_number)
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    reply_to UUID REFERENCES chat_messages(id),
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    related_id UUID, -- Generic reference to related entity
    related_type VARCHAR(100), -- Type of related entity
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_projects_client_company_id ON projects(client_company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX idx_project_teams_user_id ON project_teams(user_id);
CREATE INDEX idx_daily_logs_project_id ON daily_logs(project_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(date);
CREATE INDEX idx_photos_daily_log_id ON photos(daily_log_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiduciary_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - can be refined later)
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Project access based on team membership
CREATE POLICY "Users can read projects they're assigned to" ON projects FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM project_teams 
        WHERE project_teams.project_id = projects.id 
        AND project_teams.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'gerente')
    )
);

-- Daily logs access
CREATE POLICY "Users can read daily logs for their projects" ON daily_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM project_teams 
        WHERE project_teams.project_id = daily_logs.project_id 
        AND project_teams.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'gerente')
    )
);

CREATE POLICY "Users can insert daily logs for their projects" ON daily_logs FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM project_teams 
        WHERE project_teams.project_id = daily_logs.project_id 
        AND project_teams.user_id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Notifications access
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Insert sample data
-- Sample company
INSERT INTO companies (name, nit, address, phone, email, legal_representative) VALUES 
('Talento Inmobiliario S.A.S', '900123456-1', 'Carrera 15 #93-47, Bogotá', '+57 1 234 5678', 'info@talentoinmobiliario.com', 'Juan Pérez');

-- Sample user (this will be linked to the authenticated user)
-- Note: You'll need to update this with the actual UUID from auth.users after creating the user
-- INSERT INTO users (id, email, full_name, role, company_id, phone) VALUES 
-- ('your-auth-user-uuid-here', 'admin@talentoinmobiliario.com', 'Administrador', 'admin', (SELECT id FROM companies WHERE nit = '900123456-1'), '+57 300 123 4567');

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiduciary_accounts_updated_at BEFORE UPDATE ON fiduciary_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON payment_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_acts_updated_at BEFORE UPDATE ON construction_acts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
