-- Construction ERP Database Schema
-- Run this SQL in your PostgreSQL database to create the required tables

-- Drop existing tables if they exist (to recreate with correct schema)
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'foreman', 'supervisor')),
    name VARCHAR(200) NOT NULL,
    site_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE sites (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(500) NOT NULL,
    incharge_id VARCHAR(50),
    incharge_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workers table
CREATE TABLE workers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    father_name VARCHAR(200),
    designation VARCHAR(100),
    daily_wage DECIMAL(10,2),
    site_id VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Attendance records table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL,
    site_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'overtime')),
    marked_by VARCHAR(50),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (worker_id) REFERENCES workers(id),
    FOREIGN KEY (site_id) REFERENCES sites(id),
    UNIQUE(worker_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_workers_site_id ON workers(site_id);
CREATE INDEX idx_attendance_site_date ON attendance_records(site_id, date);
CREATE INDEX idx_attendance_worker_date ON attendance_records(worker_id, date);
CREATE INDEX idx_users_username ON users(username);

-- Insert demo admin user (password: admin123)
INSERT INTO users (id, username, password_hash, role, name) 
VALUES (
    'admin-001', 
    'admin', 
    '$2b$10$bwVHv3COt1GY1MNn2w..yOawQQn67n2eKyNuLbWkmmSMf8OjsDqRO', 
    'admin', 
    'System Administrator'
);

-- Insert demo site
INSERT INTO sites (id, name, location, incharge_id, incharge_name, is_active) 
VALUES (
    'site-001', 
    'Downtown Construction Site', 
    '123 Main Street, Downtown', 
    'admin-001', 
    'System Administrator', 
    true
);

-- Insert demo foreman user
INSERT INTO users (id, username, password_hash, role, name, site_id) 
VALUES (
    'foreman-001', 
    'foreman1', 
    '$2b$10$bwVHv3COt1GY1MNn2w..yOawQQn67n2eKyNuLbWkmmSMf8OjsDqRO', 
    'foreman', 
    'John Foreman', 
    'site-001'
);

-- Insert demo workers
INSERT INTO workers (id, name, father_name, designation, daily_wage, site_id, phone) VALUES
('worker-001', 'Rajesh Kumar', 'Ram Kumar', 'Mason', 800.00, 'site-001', '9876543210'),
('worker-002', 'Suresh Singh', 'Mohan Singh', 'Helper', 600.00, 'site-001', '9876543211'),
('worker-003', 'Mahesh Yadav', 'Ravi Yadav', 'Electrician', 1000.00, 'site-001', '9876543212'),
('worker-004', 'Ramesh Sharma', 'Gopal Sharma', 'Plumber', 900.00, 'site-001', '9876543213'),
('worker-005', 'Dinesh Gupta', 'Hari Gupta', 'Carpenter', 850.00, 'site-001', '9876543214');

COMMIT;