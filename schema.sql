-- Aeiforo RBAC Schema for Neon PostgreSQL
-- Run this against your Neon database to set up tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- Organisations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organisations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  industry   TEXT,
  country    TEXT,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Permissions (resource + action pairs)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

-- ═══════════════════════════════════════════
-- Roles (scoped to organisation)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- ═══════════════════════════════════════════
-- Role ↔ Permission mapping
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ═══════════════════════════════════════════
-- Users
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organisations(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_login    TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- User ↔ Role assignments
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- ═══════════════════════════════════════════
-- Invitations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES organisations(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role_id    UUID REFERENCES roles(id),
  invited_by UUID REFERENCES users(id),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Seed: permissions
-- ═══════════════════════════════════════════
INSERT INTO permissions (resource, action, description) VALUES
  ('dashboard',   'view',    'View executive dashboard'),
  ('calculators', 'view',    'View GHG calculators'),
  ('calculators', 'edit',    'Run calculations and save results'),
  ('data',        'view',    'View data ingestion modules'),
  ('data',        'upload',  'Upload emission data'),
  ('data',        'approve', 'Approve submitted data'),
  ('reports',     'view',    'View published reports'),
  ('reports',     'create',  'Create and edit reports'),
  ('reports',     'publish', 'Publish reports externally'),
  ('analytics',   'view',    'View analytics and anomaly detection'),
  ('workflow',    'view',    'View workflow tasks'),
  ('workflow',    'approve', 'Approve workflow steps'),
  ('audit',       'view',    'View audit trail'),
  ('admin',       'users',   'Manage users and invitations'),
  ('admin',       'roles',   'Manage roles and permissions'),
  ('admin',       'org',     'Manage organisation settings'),
  ('admin',       'settings','Manage system settings')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- Seed: default organisation
-- ═══════════════════════════════════════════
INSERT INTO organisations (id, name, slug, industry, country) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Aeiforo Demo', 'aeiforo-demo', 'Technology', 'GB')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- Seed: default roles
-- ═══════════════════════════════════════════
INSERT INTO roles (id, org_id, name, slug, description, is_system) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Platform Admin', 'admin',   'Full system access — manage users, roles, org settings, and all modules', true),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Team Lead',      'team-lead','Manage team data, approve submissions, view all reports', true),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Analyst',        'analyst',  'Run calculators, upload data, create reports', true),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Viewer',         'viewer',   'Read-only access to dashboards, reports, and analytics', true),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Auditor',        'auditor',  'Read-only access to all data plus audit trail', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- Seed: role → permission mappings
-- ═══════════════════════════════════════════
-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000010', id FROM permissions
ON CONFLICT DO NOTHING;

-- Team Lead
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000011', id FROM permissions
  WHERE (resource, action) IN (
    ('dashboard','view'),('calculators','view'),('calculators','edit'),
    ('data','view'),('data','upload'),('data','approve'),
    ('reports','view'),('reports','create'),
    ('analytics','view'),('workflow','view'),('workflow','approve'),
    ('audit','view'),('admin','users')
  )
ON CONFLICT DO NOTHING;

-- Analyst
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000012', id FROM permissions
  WHERE (resource, action) IN (
    ('dashboard','view'),('calculators','view'),('calculators','edit'),
    ('data','view'),('data','upload'),
    ('reports','view'),('reports','create'),
    ('analytics','view'),('workflow','view')
  )
ON CONFLICT DO NOTHING;

-- Viewer
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000013', id FROM permissions
  WHERE (resource, action) IN (
    ('dashboard','view'),('calculators','view'),
    ('data','view'),('reports','view'),('analytics','view'),
    ('workflow','view')
  )
ON CONFLICT DO NOTHING;

-- Auditor
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000014', id FROM permissions
  WHERE (resource, action) IN (
    ('dashboard','view'),('calculators','view'),
    ('data','view'),('reports','view'),('analytics','view'),
    ('workflow','view'),('audit','view')
  )
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- Seed: default admin user (password: demo2026)
-- bcrypt hash of 'demo2026'
-- ═══════════════════════════════════════════
INSERT INTO users (id, org_id, email, name, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001',
   'admin@aeiforo.com', 'Jane Mitchell',
   '$2a$10$rQEY7GXHXC8Kj8QvZo2oOuFZR6.wZQBaGaXCYl1pYVW5mLZjJxkS2')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;
