-- Database initialization script
-- This script runs when PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE ecommerce_test;

-- Create additional users if needed
-- CREATE USER test_user WITH PASSWORD 'test_password';
-- GRANT ALL PRIVILEGES ON DATABASE ecommerce_test TO test_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance (will be created by migrations, but can be pre-created)
-- These will be ignored if they already exist

-- Log the initialization
SELECT 'Database initialization completed' AS status;