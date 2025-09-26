-- Crear el usuario postgres con contraseña si no existe
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles 
      WHERE  rolname = 'postgres') THEN
      
      CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'password';
   END IF;
END
$do$;

-- Asegurar que postgres tenga los permisos correctos
ALTER ROLE postgres WITH SUPERUSER CREATEDB CREATEROLE REPLICATION;

-- Cambiar contraseña del usuario postgres
ALTER USER postgres PASSWORD 'password';

-- Crear la base de datos si no existe
SELECT 'CREATE DATABASE ecommerce_async'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecommerce_async')\gexec

-- Conceder permisos
GRANT ALL PRIVILEGES ON DATABASE ecommerce_async TO postgres;