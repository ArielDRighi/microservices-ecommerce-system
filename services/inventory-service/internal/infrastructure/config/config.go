package config

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

// Config contiene toda la configuración de la aplicación
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Logger   LoggerConfig
}

// ServerConfig configuración del servidor HTTP
type ServerConfig struct {
	Port            string `envconfig:"PORT" default:"8080"`
	Environment     string `envconfig:"ENVIRONMENT" default:"development"`
	ReadTimeout     int    `envconfig:"READ_TIMEOUT" default:"10"`
	WriteTimeout    int    `envconfig:"WRITE_TIMEOUT" default:"10"`
	ShutdownTimeout int    `envconfig:"SHUTDOWN_TIMEOUT" default:"5"`
}

// DatabaseConfig configuración de PostgreSQL
type DatabaseConfig struct {
	Host     string `envconfig:"DB_HOST" required:"true"`
	Port     int    `envconfig:"DB_PORT" default:"5432"`
	User     string `envconfig:"DB_USER" required:"true"`
	Password string `envconfig:"DB_PASSWORD" required:"true"`
	Database string `envconfig:"DB_NAME" required:"true"`
	SSLMode  string `envconfig:"DB_SSLMODE" default:"disable"`
	MaxConns int    `envconfig:"DB_MAX_CONNS" default:"25"`
	MinConns int    `envconfig:"DB_MIN_CONNS" default:"5"`
}

// RedisConfig configuración de Redis
type RedisConfig struct {
	Host     string `envconfig:"REDIS_HOST" required:"true"`
	Port     int    `envconfig:"REDIS_PORT" default:"6379"`
	Password string `envconfig:"REDIS_PASSWORD"`
	DB       int    `envconfig:"REDIS_DB" default:"0"`
}

// LoggerConfig configuración del sistema de logs
type LoggerConfig struct {
	Level  string `envconfig:"LOG_LEVEL" default:"info"`
	Format string `envconfig:"LOG_FORMAT" default:"json"`
}

// Load carga la configuración desde .env y variables de sistema
func Load() (*Config, error) {
	// Intentar cargar .env (opcional en producción)
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No .env file found, using system environment variables")
	}

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("failed to process config: %w", err)
	}

	// Validaciones custom
	if cfg.Database.MaxConns < cfg.Database.MinConns {
		return nil, fmt.Errorf("DB_MAX_CONNS must be >= DB_MIN_CONNS")
	}

	return &cfg, nil
}

// GetDSN construye el Data Source Name para PostgreSQL
func (d *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Database, d.SSLMode,
	)
}

// GetRedisAddr retorna la dirección completa de Redis
func (r *RedisConfig) GetRedisAddr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}
