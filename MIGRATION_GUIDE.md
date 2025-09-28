# Migration Guide: MongoDB → Supabase + Render + Vercel

## Overview
Migrating from MongoDB/Railway/Firebase to **Supabase (PostgreSQL) + Render (Backend) + Vercel (Frontend)**

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to your users
4. Note down your project URL and anon key

### 1.2 Database Schema
Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'site_incharge', 'foreman')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  site_id UUID REFERENCES sites(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  incharge_id UUID REFERENCES users(id),
  incharge_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workers table
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255),
  designation VARCHAR(255) NOT NULL,
  daily_wage INTEGER NOT NULL,
  site_id UUID REFERENCES sites(id) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  site_id UUID REFERENCES sites(id) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day')),
  marked_by UUID REFERENCES users(id),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(worker_id, date)
);

-- Indexes for performance
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_site ON attendance_records(site_id);
CREATE INDEX idx_attendance_worker ON attendance_records(worker_id);
CREATE INDEX idx_workers_site ON workers(site_id);
```

### 1.3 Insert Demo Data
```sql
-- Insert demo site first
INSERT INTO sites (id, name, location, incharge_name, is_active) 
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Downtown Construction Site', 'Mumbai, Maharashtra', 'Sarah Johnson', true);

-- Insert demo users
INSERT INTO users (id, username, role, name, email, site_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'demo_admin', 'admin', 'Michael Davis', 'michael.davis@construction.com', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'demo_site_incharge', 'site_incharge', 'Sarah Johnson', 'sarah.johnson@construction.com', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440004', 'demo_foreman', 'foreman', 'John Smith', 'john.smith@construction.com', '550e8400-e29b-41d4-a716-446655440001');

-- Update site incharge_id
UPDATE sites SET incharge_id = '550e8400-e29b-41d4-a716-446655440003' WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Insert demo workers
INSERT INTO workers (name, father_name, designation, daily_wage, site_id, phone) VALUES
('Rajesh Kumar', 'Mahesh Kumar', 'Mason', 800, '550e8400-e29b-41d4-a716-446655440001', '9876543210'),
('Suresh Sharma', 'Naresh Sharma', 'Carpenter', 900, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Ramesh Yadav', 'Kailash Yadav', 'Helper', 600, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Dinesh Gupta', 'Harish Gupta', 'Electrician', 1200, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Mukesh Singh', 'Sohan Singh', 'Plumber', 1000, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Vikash Jha', 'Ramesh Jha', 'Mason', 750, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Ravi Verma', 'Shiv Verma', 'Helper', 650, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Sandeep Roy', 'Umesh Roy', 'Carpenter', 850, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Anil Tiwari', 'Shankar Tiwari', 'Welder', 1100, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Deepak Pandey', 'Ajay Pandey', 'Helper', 600, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Gopal Sharma', 'Raghav Sharma', 'Mason', 800, '550e8400-e29b-41d4-a716-446655440001', NULL),
('Krishnan Nair', 'Mohan Nair', 'Supervisor', 1500, '550e8400-e29b-41d4-a716-446655440001', NULL);
```

## Step 2: Update Environment Variables

Update your `.env` file:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Keep existing
JWT_SECRET=f4a14fdb3fa763ae520ae7e2cae8777671a13ecef6beb049bf3b947e713b1b95959de1590b2471edd0f29027cdc96d5a7e986c3812c9708c5ad6a818863fe43e
AUTH_SECRET=f4a14fdb3fa763ae520ae7e2cae8777671a13ecef6beb049bf3b947e713b1b95959de1590b2471edd0f29027cdc96d5a7e986c3812c9708c5ad6a818863fe43e

# Remove MongoDB
# MONGODB_URI=...
```

## Step 3: Deploy to Render

### 3.1 Create render.yaml
```yaml
services:
  - type: web
    name: erp-backend
    env: node
    buildCommand: npm run build:server
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        fromDatabase:
          name: erp-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: AUTH_SECRET
        sync: false
```

### 3.2 Render Deployment Steps
1. Connect your GitHub repo to Render
2. Create new Web Service
3. Set build command: `npm run build:server`
4. Set start command: `npm run start:prod`
5. Add environment variables from Supabase

## Step 4: Deploy Frontend to Vercel

### 4.1 Create vercel.json
```json
{
  "builds": [
    {
      "src": "dist/spa/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-render-app.onrender.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/spa/$1"
    }
  ]
}
```

### 4.2 Vercel Deployment
1. Connect GitHub repo to Vercel
2. Set build command: `npm run build:client`
3. Set output directory: `dist/spa`
4. Add environment variable for API URL

## Step 5: Data Migration

### 5.1 Export from MongoDB
```javascript
// migration-script.js
const { MongoClient } = require('mongodb');

async function exportData() {
  const client = new MongoClient('your_mongodb_uri');
  await client.connect();
  const db = client.db('constructerp');
  
  const users = await db.collection('users').find({}).toArray();
  const workers = await db.collection('workers').find({}).toArray();
  const sites = await db.collection('sites').find({}).toArray();
  const attendance = await db.collection('attendanceRecords').find({}).toArray();
  
  console.log('Users:', JSON.stringify(users, null, 2));
  console.log('Workers:', JSON.stringify(workers, null, 2));
  console.log('Sites:', JSON.stringify(sites, null, 2));
  console.log('Attendance:', JSON.stringify(attendance, null, 2));
  
  await client.close();
}

exportData();
```

### 5.2 Import to Supabase
Use the exported data to create INSERT statements for Supabase.

## Next Steps
1. ✅ Setup Supabase project and run SQL schema
2. ✅ Update code to use PostgreSQL instead of MongoDB  
3. ✅ Deploy backend to Render
4. ✅ Deploy frontend to Vercel
5. ✅ Migrate existing data
6. ✅ Update DNS/domain settings
7. ✅ Test everything works

## Benefits After Migration
- ✅ **No cold starts** - Render keeps your server warm
- ✅ **Free forever** - Both Supabase and Render have generous free tiers
- ✅ **Better performance** - PostgreSQL + optimized hosting
- ✅ **Real-time features** - Supabase provides real-time subscriptions
- ✅ **Built-in auth** - Supabase auth system (optional upgrade)