-- ============================================================================
-- Database Initialization Script - Microservices E-commerce System (Proyecto 3)
-- ============================================================================
-- Este script se ejecuta cuando el contenedor de PostgreSQL inicia por primera vez
-- Crea bases de datos separadas para cada microservicio

-- ============================================================================
-- BASES DE DATOS POR SERVICIO
-- ============================================================================

-- Base de datos para Orders Service (NestJS)
CREATE DATABASE microservices_orders;

-- Base de datos para Inventory Service (Go)
CREATE DATABASE microservices_inventory;

-- Base de datos para tests (opcional)
CREATE DATABASE microservices_test;

-- ============================================================================
-- EXTENSIONES NECESARIAS
-- ============================================================================

-- Conectar a cada base de datos y habilitar extensiones

\c microservices_orders;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c microservices_inventory;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c microservices_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USUARIOS Y PERMISOS (OPCIONAL)
-- ============================================================================

-- Si quieres crear usuarios específicos por servicio, descomenta:

-- CREATE USER orders_user WITH PASSWORD 'orders_password';
-- GRANT ALL PRIVILEGES ON DATABASE microservices_orders TO orders_user;

-- CREATE USER inventory_user WITH PASSWORD 'inventory_password';
-- GRANT ALL PRIVILEGES ON DATABASE microservices_inventory TO inventory_user;

-- ============================================================================
-- LOG DE INICIALIZACIÓN
-- ============================================================================

\c postgres;
SELECT 'Microservices E-commerce System - Bases de datos inicializadas correctamente' AS status;
SELECT 'microservices_orders, microservices_inventory, microservices_test' AS databases_created;
