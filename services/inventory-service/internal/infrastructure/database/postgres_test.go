package database

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestNewPostgresDB_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	// Start PostgreSQL container
	postgresContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err)
	defer func() {
		if err := postgresContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %s", err)
		}
	}()

	// Get connection details
	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	t.Run("should connect to PostgreSQL successfully in development mode", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "testuser",
			Password: "testpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		// Act
		db, err := NewPostgresDB(cfg, "development")

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, db)

		// Test connection is working
		sqlDB, err := db.DB()
		require.NoError(t, err)
		err = sqlDB.Ping()
		assert.NoError(t, err)

		// Cleanup
		err = CloseDB(db)
		assert.NoError(t, err)
	})

	t.Run("should connect to PostgreSQL successfully in production mode", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "testuser",
			Password: "testpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		// Act
		db, err := NewPostgresDB(cfg, "production")

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, db)

		// Cleanup
		err = CloseDB(db)
		assert.NoError(t, err)
	})

	t.Run("should configure connection pool correctly", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "testuser",
			Password: "testpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 50,
			MinConns: 10,
		}

		// Act
		db, err := NewPostgresDB(cfg, "development")
		require.NoError(t, err)
		defer CloseDB(db)

		// Assert
		sqlDB, err := db.DB()
		require.NoError(t, err)

		stats := sqlDB.Stats()
		assert.GreaterOrEqual(t, stats.MaxOpenConnections, 50)
	})

	t.Run("should return error for invalid credentials", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "wronguser",
			Password: "wrongpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		// Act
		db, err := NewPostgresDB(cfg, "development")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, db)
	})

	t.Run("should return error for invalid database name", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "testuser",
			Password: "testpass",
			Database: "nonexistentdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		// Act
		db, err := NewPostgresDB(cfg, "development")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, db)
	})

	t.Run("should return error for invalid host", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     "invalid-host-that-does-not-exist",
			Port:     5432,
			User:     "testuser",
			Password: "testpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		// Act
		db, err := NewPostgresDB(cfg, "development")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, db)
	})
}

func TestCloseDB(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	// Start PostgreSQL container
	postgresContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err)
	defer postgresContainer.Terminate(ctx)

	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	t.Run("should close database connection successfully", func(t *testing.T) {
		// Arrange
		cfg := &config.DatabaseConfig{
			Host:     host,
			Port:     port.Int(),
			User:     "testuser",
			Password: "testpass",
			Database: "testdb",
			SSLMode:  "disable",
			MaxConns: 25,
			MinConns: 5,
		}

		db, err := NewPostgresDB(cfg, "development")
		require.NoError(t, err)

		// Act
		err = CloseDB(db)

		// Assert
		assert.NoError(t, err)

		// Verify connection is closed
		sqlDB, err := db.DB()
		require.NoError(t, err)
		err = sqlDB.Ping()
		assert.Error(t, err) // Should fail because connection is closed
	})
}
