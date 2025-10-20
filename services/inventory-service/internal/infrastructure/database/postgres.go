package database

import (
	"fmt"
	"log"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewPostgresDB creates and configures a new PostgreSQL connection using GORM
func NewPostgresDB(cfg *config.DatabaseConfig, env string) (*gorm.DB, error) {
	// Configure GORM logger based on environment
	gormLogger := logger.Default
	if env == "development" {
		// In development, log all SQL queries with details
		gormLogger = logger.Default.LogMode(logger.Info)
		log.Println("📝 GORM logger set to INFO mode (development)")
	} else {
		// In production, only log errors
		gormLogger = logger.Default.LogMode(logger.Error)
		log.Println("📝 GORM logger set to ERROR mode (production)")
	}

	// Build DSN (Data Source Name)
	dsn := cfg.GetDSN()

	// Open connection with GORM
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		// PrepareStmt caches prepared statements for better performance
		PrepareStmt: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	// Get underlying sql.DB to configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(cfg.MaxConns)        // Maximum number of open connections
	sqlDB.SetMaxIdleConns(cfg.MinConns)        // Maximum number of idle connections
	sqlDB.SetConnMaxLifetime(time.Hour)        // Maximum lifetime of a connection
	sqlDB.SetConnMaxIdleTime(10 * time.Minute) // Maximum idle time of a connection

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	log.Printf("✅ PostgreSQL connected successfully (pool: %d-%d connections)", cfg.MinConns, cfg.MaxConns)

	return db, nil
}

// CloseDB gracefully closes the database connection
func CloseDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("failed to close database connection: %w", err)
	}

	log.Println("✅ PostgreSQL connection closed successfully")
	return nil
}
