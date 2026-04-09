import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db'
import { cors } from './_auth'
import bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sql = getDb()

  try {
    // Create tables
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`

    await sql`CREATE TABLE IF NOT EXISTS organisations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      industry TEXT, country TEXT, logo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resource TEXT NOT NULL, action TEXT NOT NULL, description TEXT,
      UNIQUE(resource, action)
    )`

    await sql`CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT,
      is_system BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, slug)
    )`

    await sql`CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )`

    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, avatar_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ
    )`

    await sql`CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT now(),
      assigned_by UUID REFERENCES users(id),
      PRIMARY KEY (user_id, role_id)
    )`

    await sql`CREATE TABLE IF NOT EXISTS invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role_id UUID REFERENCES roles(id),
      invited_by UUID REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // --- New tables ---

    await sql`CREATE TABLE IF NOT EXISTS facilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT,
      location TEXT,
      country TEXT DEFAULT 'TH',
      type TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      production_volume NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS emission_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      scope INTEGER NOT NULL CHECK (scope IN (1,2,3)),
      category TEXT,
      fuel_type TEXT,
      unit TEXT DEFAULT 'tCO2e',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS activity_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      facility_id UUID REFERENCES facilities(id),
      source_id UUID REFERENCES emission_sources(id),
      period_year INTEGER NOT NULL,
      period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
      scope INTEGER NOT NULL,
      category TEXT,
      subcategory TEXT,
      fuel_type TEXT,
      activity_value NUMERIC NOT NULL DEFAULT 0,
      activity_unit TEXT,
      emission_factor NUMERIC,
      ef_source TEXT,
      ef_unit TEXT,
      co2e_tonnes NUMERIC NOT NULL DEFAULT 0,
      co2 NUMERIC DEFAULT 0,
      ch4 NUMERIC DEFAULT 0,
      n2o NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','anchored')),
      submitted_by UUID REFERENCES users(id),
      approved_by UUID REFERENCES users(id),
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS workflow_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','anchored')),
      facility_id UUID REFERENCES facilities(id),
      data_type TEXT,
      period TEXT,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
      assigned_to UUID REFERENCES users(id),
      assigned_by UUID REFERENCES users(id),
      submitted_by UUID REFERENCES users(id),
      due_date DATE,
      completed_at TIMESTAMPTZ,
      comments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS blockchain_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      record_type TEXT NOT NULL,
      reference_id UUID,
      data_hash TEXT NOT NULL,
      previous_hash TEXT,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      verifier_did TEXT,
      facility_name TEXT,
      event_type TEXT,
      status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','confirmed','anchored')),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      framework_id TEXT,
      framework_name TEXT,
      title TEXT NOT NULL,
      period TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
      format TEXT DEFAULT 'PDF',
      pages INTEGER DEFAULT 0,
      assurance_status TEXT DEFAULT 'not_started',
      generated_by UUID REFERENCES users(id),
      published_at TIMESTAMPTZ,
      file_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS disclosure_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      framework_code TEXT NOT NULL,
      disclosure_code TEXT NOT NULL,
      period_year INTEGER NOT NULL,
      response_data JSONB DEFAULT '{}'::jsonb,
      status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete','approved')),
      updated_by UUID REFERENCES users(id),
      updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, framework_code, disclosure_code, period_year)
    )`

    await sql`CREATE TABLE IF NOT EXISTS anomalies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      facility_id UUID REFERENCES facilities(id),
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
      title TEXT NOT NULL,
      description TEXT,
      scope INTEGER,
      metric TEXT,
      expected_value NUMERIC,
      actual_value NUMERIC,
      deviation_pct NUMERIC,
      status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
      detected_at TIMESTAMPTZ DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      details JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // ===== SEED DATA =====

    // Seed permissions
    const perms = [
      ['dashboard','view','View executive dashboard'],
      ['calculators','view','View GHG calculators'],
      ['calculators','edit','Run calculations and save results'],
      ['data','view','View data ingestion modules'],
      ['data','upload','Upload emission data'],
      ['data','approve','Approve submitted data'],
      ['reports','view','View published reports'],
      ['reports','create','Create and edit reports'],
      ['reports','publish','Publish reports externally'],
      ['analytics','view','View analytics and anomaly detection'],
      ['workflow','view','View workflow tasks'],
      ['workflow','approve','Approve workflow steps'],
      ['audit','view','View audit trail'],
      ['admin','users','Manage users and invitations'],
      ['admin','roles','Manage roles and permissions'],
      ['admin','org','Manage organisation settings'],
      ['admin','settings','Manage system settings'],
    ]
    for (const [resource, action, description] of perms) {
      await sql`INSERT INTO permissions (resource, action, description) VALUES (${resource}, ${action}, ${description}) ON CONFLICT DO NOTHING`
    }

    // Seed org
    await sql`INSERT INTO organisations (id, name, slug, industry, country) VALUES ('00000000-0000-0000-0000-000000000001', 'Aeiforo Demo', 'aeiforo-demo', 'Technology', 'GB') ON CONFLICT DO NOTHING`

    // Seed roles
    const roles = [
      ['00000000-0000-0000-0000-000000000010','Platform Admin','admin','Full system access',true],
      ['00000000-0000-0000-0000-000000000011','Team Lead','team-lead','Manage team, approve submissions',true],
      ['00000000-0000-0000-0000-000000000012','Analyst','analyst','Run calculators, upload data, create reports',true],
      ['00000000-0000-0000-0000-000000000013','Viewer','viewer','Read-only access to dashboards and reports',true],
      ['00000000-0000-0000-0000-000000000014','Auditor','auditor','Read-only plus audit trail access',true],
    ] as const
    for (const [id, name, slug, desc, sys] of roles) {
      await sql`INSERT INTO roles (id, org_id, name, slug, description, is_system) VALUES (${id}, '00000000-0000-0000-0000-000000000001', ${name}, ${slug}, ${desc}, ${sys}) ON CONFLICT DO NOTHING`
    }

    // Seed all permissions for admin
    await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000010', id FROM permissions ON CONFLICT DO NOTHING`

    // Team Lead permissions
    const tlPerms = [['dashboard','view'],['calculators','view'],['calculators','edit'],['data','view'],['data','upload'],['data','approve'],['reports','view'],['reports','create'],['analytics','view'],['workflow','view'],['workflow','approve'],['audit','view'],['admin','users']]
    for (const [r, a] of tlPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000011', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Analyst permissions
    const anPerms = [['dashboard','view'],['calculators','view'],['calculators','edit'],['data','view'],['data','upload'],['reports','view'],['reports','create'],['analytics','view'],['workflow','view']]
    for (const [r, a] of anPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000012', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Viewer permissions
    const vwPerms = [['dashboard','view'],['calculators','view'],['data','view'],['reports','view'],['analytics','view'],['workflow','view']]
    for (const [r, a] of vwPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000013', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Auditor permissions
    const auPerms = [['dashboard','view'],['calculators','view'],['data','view'],['reports','view'],['analytics','view'],['workflow','view'],['audit','view']]
    for (const [r, a] of auPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000014', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Seed admin user
    const hash = bcrypt.hashSync('demo2026', 10)
    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'admin@aeiforo.com', 'Jane Mitchell', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010') ON CONFLICT DO NOTHING`

    // --- Seed additional demo users ---
    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'tl@aeiforo.com', 'David Chen', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011') ON CONFLICT DO NOTHING`

    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'fm@aeiforo.com', 'Maria Santos', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000012') ON CONFLICT DO NOTHING`

    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'so@aeiforo.com', 'Priya Sharma', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000013') ON CONFLICT DO NOTHING`

    // --- Seed facilities ---
    const ORG = '00000000-0000-0000-0000-000000000001'
    const facilities = [
      ['00000000-0000-0000-0000-f00000000001','Rayong Refinery','RYR','Rayong','TH','refinery',12.6814,101.2778,185000],
      ['00000000-0000-0000-0000-f00000000002','Map Ta Phut Olefins','MTP-OLE','Rayong','TH','olefins',12.7105,101.1548,320000],
      ['00000000-0000-0000-0000-f00000000003','Aromatics Complex','MTP-ARO','Rayong','TH','aromatics',12.7082,101.1601,210000],
      ['00000000-0000-0000-0000-f00000000004','HMC Polymers','HMC-POL','Rayong','TH','polymers',12.6950,101.1680,160000],
      ['00000000-0000-0000-0000-f00000000005','GC Logistics Terminal','GCL','Chonburi','TH','logistics',13.3611,100.9847,0],
      ['00000000-0000-0000-0000-f00000000006','Nava Nakorn Plant','NNK','Pathum Thani','TH','green_chem',14.1200,100.6250,45000],
      ['00000000-0000-0000-0000-f00000000007','Bioplastics Innovation Center','BIO-IC','Rayong','TH','green_chem',12.6880,101.2500,12000],
      ['00000000-0000-0000-0000-f00000000008','GC Utilities & Power','GCU-PWR','Rayong','TH','utilities',12.7000,101.1700,0],
    ] as const
    for (const [id, name, code, location, country, type, lat, lng, vol] of facilities) {
      await sql`INSERT INTO facilities (id, org_id, name, code, location, country, type, latitude, longitude, production_volume) VALUES (${id}, ${ORG}, ${name}, ${code}, ${location}, ${country}, ${type}, ${lat}, ${lng}, ${vol}) ON CONFLICT DO NOTHING`
    }

    // --- Seed activity data (Q1 2026 for facilities 1-4, Scope 1/2/3) ---
    // Totals target: S1 ~2.12M, S2 ~945K, S3 ~2.51M tCO2e for the quarter
    const ADMIN = '00000000-0000-0000-0000-000000000100'
    const TL    = '00000000-0000-0000-0000-000000000101'
    const AN    = '00000000-0000-0000-0000-000000000102'
    const F1 = '00000000-0000-0000-0000-f00000000001'
    const F2 = '00000000-0000-0000-0000-f00000000002'
    const F3 = '00000000-0000-0000-0000-f00000000003'
    const F4 = '00000000-0000-0000-0000-f00000000004'

    // Each row: [id, facility_id, month, scope, category, fuel_type, activity_value, activity_unit, ef, ef_source, co2e, co2, ch4, n2o, status, submitted_by, approved_by]
    const activityRows: [string,string,number,number,string,string,number,string,number,string,number,number,number,number,string,string,string|null][] = [
      // --- Facility 1: Rayong Refinery ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000001',F1,1,1,'Stationary combustion','Natural gas',  48200,'TJ',56.1,'IPCC 2006',  195200, 194100,  820,  280,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000002',F1,2,1,'Stationary combustion','Natural gas',  46800,'TJ',56.1,'IPCC 2006',  189500, 188400,  810,  290,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000003',F1,3,1,'Stationary combustion','Natural gas',  49100,'TJ',56.1,'IPCC 2006',  198800, 197700,  830,  270,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000004',F1,1,1,'Process emissions','Crude oil',       12400,'kL',2.68,'API Compendium',33300, 33100,   150,   50,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000005',F1,2,1,'Process emissions','Crude oil',       11800,'kL',2.68,'API Compendium',31700, 31500,   140,   60,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000006',F1,3,1,'Process emissions','Crude oil',       12700,'kL',2.68,'API Compendium',34100, 33900,   150,   50,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000007',F1,1,2,'Purchased electricity','Grid',        280000,'MWh',0.4987,'TGO 2024',  82100,  81800,  210,   90,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000008',F1,2,2,'Purchased electricity','Grid',        272000,'MWh',0.4987,'TGO 2024',  79700,  79400,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000009',F1,3,2,'Purchased electricity','Grid',        285000,'MWh',0.4987,'TGO 2024',  83600,  83300,  210,   90,'submitted',AN,null],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000010',F1,1,3,'Cat 1 - Purchased goods','Feedstock', 450000,'t',1.82,'ecoinvent 3.10', 210000,208000, 1500,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000011',F1,2,3,'Cat 1 - Purchased goods','Feedstock', 438000,'t',1.82,'ecoinvent 3.10', 204500,202500, 1500,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000012',F1,3,3,'Cat 1 - Purchased goods','Feedstock', 462000,'t',1.82,'ecoinvent 3.10', 215800,213800, 1500,  500,'draft',AN,null],

      // --- Facility 2: Map Ta Phut Olefins ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000013',F2,1,1,'Stationary combustion','Natural gas',  62000,'TJ',56.1,'IPCC 2006',  251200, 249800, 1050,  350,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000014',F2,2,1,'Stationary combustion','Natural gas',  60500,'TJ',56.1,'IPCC 2006',  245100, 243700, 1040,  360,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000015',F2,3,1,'Stationary combustion','Natural gas',  63200,'TJ',56.1,'IPCC 2006',  256000, 254600, 1050,  350,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000016',F2,1,1,'Fugitive emissions','Methane',         8400,'t',25.0,'IPCC AR5',      18500,  4200, 14100,  200,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000017',F2,2,1,'Fugitive emissions','Methane',         8200,'t',25.0,'IPCC AR5',      18100,  4100, 13800,  200,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000018',F2,3,1,'Fugitive emissions','Methane',         9100,'t',25.0,'IPCC AR5',      20100,  4600, 15300,  200,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000019',F2,1,2,'Purchased electricity','Grid',        195000,'MWh',0.4987,'TGO 2024',  57200,  56900,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000020',F2,2,2,'Purchased electricity','Grid',        188000,'MWh',0.4987,'TGO 2024',  55100,  54800,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000021',F2,3,2,'Purchased electricity','Grid',        200000,'MWh',0.4987,'TGO 2024',  58700,  58400,  200,  100,'approved',AN,TL],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000022',F2,1,3,'Cat 1 - Purchased goods','Naphtha',  310000,'t',2.41,'DEDE Thailand', 247000,244800, 1600,  600,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000023',F2,2,3,'Cat 1 - Purchased goods','Naphtha',  302000,'t',2.41,'DEDE Thailand', 240600,238400, 1600,  600,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000024',F2,3,3,'Cat 1 - Purchased goods','Naphtha',  318000,'t',2.41,'DEDE Thailand', 253200,251000, 1600,  600,'submitted',AN,null],

      // --- Facility 3: Aromatics Complex ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000025',F3,1,1,'Stationary combustion','Fuel oil',    28500,'TJ',77.4,'IPCC 2006',  68400,  67800,  420,  180,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000026',F3,2,1,'Stationary combustion','Fuel oil',    27800,'TJ',77.4,'IPCC 2006',  66700,  66100,  420,  180,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000027',F3,3,1,'Stationary combustion','Fuel oil',    29200,'TJ',77.4,'IPCC 2006',  70100,  69500,  420,  180,'approved',AN,TL],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000028',F3,1,2,'Purchased electricity','Grid',        165000,'MWh',0.4987,'TGO 2024',  48400,  48100,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000029',F3,2,2,'Purchased electricity','Grid',        160000,'MWh',0.4987,'TGO 2024',  46900,  46600,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000030',F3,3,2,'Purchased electricity','Grid',        168000,'MWh',0.4987,'TGO 2024',  49300,  49000,  200,  100,'draft',AN,null],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000031',F3,1,3,'Cat 4 - Transportation','Diesel',     84000,'t',3.17,'DEDE Thailand', 110500,109500,  700,  300,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000032',F3,2,3,'Cat 4 - Transportation','Diesel',     81000,'t',3.17,'DEDE Thailand', 106600,105600,  700,  300,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000033',F3,3,3,'Cat 4 - Transportation','Diesel',     86000,'t',3.17,'DEDE Thailand', 113100,112100,  700,  300,'approved',AN,TL],

      // --- Facility 4: HMC Polymers ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000034',F4,1,1,'Stationary combustion','Natural gas',  18500,'TJ',56.1,'IPCC 2006',   74900,  74400,  370,  130,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000035',F4,2,1,'Stationary combustion','Natural gas',  18000,'TJ',56.1,'IPCC 2006',   72900,  72400,  370,  130,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000036',F4,3,1,'Stationary combustion','Natural gas',  18800,'TJ',56.1,'IPCC 2006',   76100,  75600,  370,  130,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000037',F4,1,2,'Purchased electricity','Grid',        145000,'MWh',0.4987,'TGO 2024',  42500,  42200,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000038',F4,2,2,'Purchased electricity','Grid',        140000,'MWh',0.4987,'TGO 2024',  41100,  40800,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000039',F4,3,2,'Purchased electricity','Grid',        148000,'MWh',0.4987,'TGO 2024',  43400,  43100,  200,  100,'approved',AN,TL],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000040',F4,1,3,'Cat 10 - End-of-life','Plastic waste',125000,'t',2.53,'ecoinvent 3.10', 176800,175000, 1300,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000041',F4,2,3,'Cat 10 - End-of-life','Plastic waste',121000,'t',2.53,'ecoinvent 3.10', 171100,169300, 1300,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000042',F4,3,3,'Cat 10 - End-of-life','Plastic waste',128000,'t',2.53,'ecoinvent 3.10', 181000,179200, 1300,  500,'approved',AN,TL],
    ]

    for (const [id,fac,month,scope,cat,fuel,val,unit,ef,efSrc,co2e,co2,ch4,n2o,status,subBy,appBy] of activityRows) {
      await sql`INSERT INTO activity_data
        (id, org_id, facility_id, period_year, period_month, scope, category, fuel_type,
         activity_value, activity_unit, emission_factor, ef_source, co2e_tonnes, co2, ch4, n2o,
         status, submitted_by, approved_by,
         submitted_at, approved_at)
        VALUES
        (${id}, ${ORG}, ${fac}, 2026, ${month}, ${scope}, ${cat}, ${fuel},
         ${val}, ${unit}, ${ef}, ${efSrc}, ${co2e}, ${co2}, ${ch4}, ${n2o},
         ${status}, ${subBy}, ${appBy},
         ${status !== 'draft' ? '2026-03-15T10:00:00Z' : null},
         ${status === 'approved' || status === 'anchored' ? '2026-03-20T14:00:00Z' : null})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed workflow tasks ---
    const workflowTasks: [string,string,string,string,string,string,string,string,string|null,string|null,string|null][] = [
      // [id, type, title, description, status, facility_id, priority, assigned_to, assigned_by, submitted_by, due_date]
      ['w0000000-0000-0000-0000-000000000001','data_approval','Approve Q1 Scope 1 — Rayong Refinery','Review and approve stationary combustion data for Jan-Mar 2026','pending',F1,'high',TL,ADMIN,AN,'2026-04-15'],
      ['w0000000-0000-0000-0000-000000000002','data_approval','Approve Q1 Scope 2 — Map Ta Phut Olefins','Review purchased electricity data for Q1','pending',F2,'medium',TL,ADMIN,AN,'2026-04-18'],
      ['w0000000-0000-0000-0000-000000000003','data_submission','Submit Mar fugitive emissions — Olefins','Complete fugitive emission data entry for March 2026','pending',F2,'high',AN,TL,null,'2026-04-10'],
      ['w0000000-0000-0000-0000-000000000004','calculation_review','Review EF update — Aromatics Scope 1','Verify updated fuel oil emission factors from IPCC 2006','in_review',F3,'medium',TL,ADMIN,AN,null],
      ['w0000000-0000-0000-0000-000000000005','report_review','Review CDP Climate Change 2026 draft','Final review of CDP questionnaire responses before submission','in_review',F1,'critical',ADMIN,TL,AN,'2026-04-30'],
      ['w0000000-0000-0000-0000-000000000006','data_approval','Approve Q1 Scope 3 — HMC Polymers','Review end-of-life processing data for Q1','in_review',F4,'medium',TL,ADMIN,AN,'2026-04-20'],
      ['w0000000-0000-0000-0000-000000000007','data_approval','Approve Jan Scope 1 — HMC Polymers','Stationary combustion data for January','approved',F4,'medium',TL,ADMIN,AN,null],
      ['w0000000-0000-0000-0000-000000000008','data_submission','Submit Q1 electricity — Aromatics','Electricity consumption data for Q1 2026','approved',F3,'low',AN,TL,null,null],
      ['w0000000-0000-0000-0000-000000000009','calculation_review','Verify Scope 2 market-based EFs','Check market-based emission factor calculations','approved',F1,'medium',TL,ADMIN,AN,null],
      ['w0000000-0000-0000-0000-000000000010','data_approval','Approve Feb process emissions — Refinery','Process emissions data rejected due to missing supporting docs','rejected',F1,'high',TL,ADMIN,AN,null],
      ['w0000000-0000-0000-0000-000000000011','report_review','Review CSRD ESRS E1 draft report','ESRS E1 climate disclosures need methodology updates','rejected',F2,'critical',ADMIN,TL,AN,'2026-05-15'],
      ['w0000000-0000-0000-0000-000000000012','data_approval','Anchor Q4 2025 Scope 1 — All Facilities','Blockchain-anchored quarterly Scope 1 dataset','anchored',F1,'high',ADMIN,TL,AN,null],
    ]

    for (const [id,type,title,desc,status,facId,priority,assignTo,assignBy,subBy,due] of workflowTasks) {
      await sql`INSERT INTO workflow_tasks
        (id, org_id, type, title, description, status, facility_id, period, priority,
         assigned_to, assigned_by, submitted_by, due_date,
         completed_at)
        VALUES
        (${id}, ${ORG}, ${type}, ${title}, ${desc}, ${status}, ${facId}, 'Q1 2026', ${priority},
         ${assignTo}, ${assignBy}, ${subBy}, ${due},
         ${status === 'approved' || status === 'rejected' || status === 'anchored' ? '2026-03-25T16:00:00Z' : null})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed blockchain records ---
    const blockchainRecords: [string,string,string|null,string,string,number,string,string,string,string,string][] = [
      // [id, record_type, reference_id, data_hash, previous_hash, block_number, tx_hash, verifier_did, facility_name, event_type, status]
      ['b0000000-0000-0000-0000-000000000001','activity_data','a0000000-0000-0000-0000-000000000001',
        '0x7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b','0x0000000000000000000000000000000000000000000000000000000000000000',
        21300001,'0xabc123def456789012345678901234567890abcdef1234567890abcdef123456','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Rayong Refinery','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000002','activity_data','a0000000-0000-0000-0000-000000000013',
        '0x8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c','0x7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
        21300042,'0xbcd234ef5678901234567890abcdef1234567890abcdef1234567890abcdef12','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Map Ta Phut Olefins','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000003','approval','a0000000-0000-0000-0000-000000000001',
        '0x9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d','0x8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        21310015,'0xcde345f6789012345678901234567890abcdef1234567890abcdef1234567890','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Rayong Refinery','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000004','activity_data','a0000000-0000-0000-0000-000000000025',
        '0xad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e','0x9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
        21320108,'0xdef456a789012345678901234567890abcdef1234567890abcdef12345678901','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Aromatics Complex','submitted','submitted'],
      ['b0000000-0000-0000-0000-000000000005','calculation','a0000000-0000-0000-0000-000000000034',
        '0xbe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f','0xad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
        21330055,'0xef5678b890123456789012345678901234567890abcdef1234567890abcdef12','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','HMC Polymers','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000006','approval','a0000000-0000-0000-0000-000000000013',
        '0xcf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a','0xbe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
        21340022,'0xfa6789c901234567890123456789012345678901234567890abcdef12345678','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Map Ta Phut Olefins','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000007','activity_data','a0000000-0000-0000-0000-000000000040',
        '0xd07b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b','0xcf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
        21350010,'0x0b789ad012345678901234567890123456789012345678901234567890abcdef','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','HMC Polymers','submitted','submitted'],
      ['b0000000-0000-0000-0000-000000000008','report',null,
        '0xe18c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c','0xd07b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
        21360033,'0x1c890be123456789012345678901234567890123456789012345678901234567','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Rayong Refinery','anchored','anchored'],
      ['b0000000-0000-0000-0000-000000000009','activity_data','a0000000-0000-0000-0000-000000000007',
        '0xf29d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d','0xe18c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
        21370066,'0x2d901cf234567890123456789012345678901234567890123456789012345678','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Rayong Refinery','verified','anchored'],
      ['b0000000-0000-0000-0000-000000000010','approval','a0000000-0000-0000-0000-000000000025',
        '0x03ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e','0xf29d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
        21380019,'0x3ea12d0345678901234567890123456789012345678901234567890123456789','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Aromatics Complex','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000011','calculation','a0000000-0000-0000-0000-000000000019',
        '0x14bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f','0x03ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e',
        21385042,'0x4fb23e1456789012345678901234567890123456789012345678901234567890','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Map Ta Phut Olefins','verified','anchored'],
      ['b0000000-0000-0000-0000-000000000012','activity_data','a0000000-0000-0000-0000-000000000037',
        '0x25c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a','0x14bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
        21390005,'0x50c34f2567890123456789012345678901234567890123456789012345678901','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','HMC Polymers','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000013','report',null,
        '0x36d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b','0x25c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a',
        21395018,'0x61d450367890123456789012345678901234567890123456789012345678901a','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Map Ta Phut Olefins','anchored','anchored'],
      ['b0000000-0000-0000-0000-000000000014','approval','a0000000-0000-0000-0000-000000000034',
        '0x47e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c','0x36d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
        21398007,'0x72e561478901234567890123456789012345678901234567890123456789012b','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','HMC Polymers','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000015','activity_data','a0000000-0000-0000-0000-000000000010',
        '0x58f36e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d','0x47e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
        21399012,'0x83f672589012345678901234567890123456789012345678901234567890123c','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Rayong Refinery','verified','anchored'],
    ]

    for (const [id,recType,refId,dataHash,prevHash,blockNum,txHash,verDid,facName,evtType,status] of blockchainRecords) {
      await sql`INSERT INTO blockchain_records
        (id, org_id, record_type, reference_id, data_hash, previous_hash, block_number,
         transaction_hash, verifier_did, facility_name, event_type, status)
        VALUES
        (${id}, ${ORG}, ${recType}, ${refId}, ${dataHash}, ${prevHash}, ${blockNum},
         ${txHash}, ${verDid}, ${facName}, ${evtType}, ${status})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed reports ---
    const reportRows: [string,string,string,string,string,string,string,number,string,string|null,string|null][] = [
      // [id, framework_id, framework_name, title, period, status, format, pages, assurance_status, generated_by, published_at]
      ['r0000000-0000-0000-0000-000000000001','CDP-CC','CDP','CDP Climate Change 2026','FY2026','in_review','PDF',127,'in_progress',ADMIN,null],
      ['r0000000-0000-0000-0000-000000000002','TCFD','TCFD','TCFD Alignment Report','FY2026','draft','PDF',84,'not_started',AN,null],
      ['r0000000-0000-0000-0000-000000000003','GRI-305','GRI','GRI 305 Emissions Disclosure','FY2026','in_review','PDF',156,'in_progress',AN,null],
      ['r0000000-0000-0000-0000-000000000004','CSRD-E1','CSRD','CSRD ESRS E1 Report','FY2026','draft','PDF',203,'not_started',ADMIN,null],
      ['r0000000-0000-0000-0000-000000000005','CDP-CC','CDP','CDP Climate Change 2025','FY2025','published','PDF',118,'completed',ADMIN,'2025-12-15T09:00:00Z'],
      ['r0000000-0000-0000-0000-000000000006','GRI','GRI','GRI Sustainability Report 2025','FY2025','published','PDF',142,'completed',AN,'2025-11-30T09:00:00Z'],
    ]

    for (const [id,fwId,fwName,title,period,status,format,pages,assurance,genBy,pubAt] of reportRows) {
      await sql`INSERT INTO reports
        (id, org_id, framework_id, framework_name, title, period, status, format, pages,
         assurance_status, generated_by, published_at)
        VALUES
        (${id}, ${ORG}, ${fwId}, ${fwName}, ${title}, ${period}, ${status}, ${format}, ${pages},
         ${assurance}, ${genBy}, ${pubAt})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed anomalies ---
    const anomalyRows: [string,string,string,string,string,string,number,string,number,number,number,string][] = [
      // [id, facility_id, type, severity, title, description, scope, metric, expected, actual, deviation_pct, status]
      ['n0000000-0000-0000-0000-000000000001',F2,'spike','critical',
        'Fugitive emissions spike at Map Ta Phut Olefins',
        'March 2026 fugitive CH4 emissions 11% above 12-month rolling average. Possible valve leak in cracker unit C-401.',
        1,'fugitive_ch4_tonnes',8300,9100,9.6,'open'],
      ['n0000000-0000-0000-0000-000000000002',F1,'trend','warning',
        'Scope 1 intensity at Rayong Refinery above trend',
        'tCO2e per barrel of crude processed has increased 4.2% vs. prior 6-month baseline. Check furnace efficiency.',
        1,'co2e_per_barrel',0.285,0.297,4.2,'investigating'],
      ['n0000000-0000-0000-0000-000000000003',F1,'gap','warning',
        'Scope 2 market/location gap widening',
        'Market-based Scope 2 exceeds location-based by 18%, up from 12% last quarter. Review REC procurement strategy.',
        2,'market_location_ratio',1.12,1.18,5.4,'open'],
      ['n0000000-0000-0000-0000-000000000004',F4,'completeness','warning',
        'Supplier data completeness below threshold',
        'Only 67% of Tier 1 suppliers have submitted FY2026 emission factors. Target is 85% by Q2.',
        3,'supplier_coverage_pct',85,67,-21.2,'open'],
      ['n0000000-0000-0000-0000-000000000005',F3,'consumption','info',
        'Unusual electricity consumption at Aromatics',
        'March electricity draw 5% above seasonal forecast. Correlates with extended turnaround maintenance window.',
        2,'electricity_mwh',160000,168000,5.0,'resolved'],
    ]

    for (const [id,facId,type,severity,title,desc,scope,metric,expected,actual,dev,status] of anomalyRows) {
      await sql`INSERT INTO anomalies
        (id, org_id, facility_id, type, severity, title, description, scope, metric,
         expected_value, actual_value, deviation_pct, status,
         resolved_at, resolved_by)
        VALUES
        (${id}, ${ORG}, ${facId}, ${type}, ${severity}, ${title}, ${desc}, ${scope}, ${metric},
         ${expected}, ${actual}, ${dev}, ${status},
         ${status === 'resolved' ? '2026-04-02T11:30:00Z' : null},
         ${status === 'resolved' ? TL : null})
        ON CONFLICT DO NOTHING`
    }

    return res.status(200).json({ ok: true, message: 'Database setup complete — tables created and seeded' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
