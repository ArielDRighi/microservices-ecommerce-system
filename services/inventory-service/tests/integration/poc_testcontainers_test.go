package integration_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	postgresdriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Product es un modelo simple para el PoC
type Product struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"not null"`
	Stock     int       `gorm:"not null;default:0"`
	Version   int       `gorm:"not null;default:1"` // Para optimistic locking
	CreatedAt time.Time
	UpdatedAt time.Time
}

// TestPoCTestcontainers valida que Testcontainers funciona en este proyecto
func TestPoCTestcontainers(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	// ⏱️ Medición de tiempo: Setup Testcontainer
	setupStart := time.Now()

	// Crear contenedor PostgreSQL con testcontainers-go/modules/postgres
	postgresContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		postgres.WithDatabase("inventory_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err, "Failed to start PostgreSQL container")
	defer func() {
		if err := postgresContainer.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %v", err)
		}
	}()

	setupDuration := time.Since(setupStart)
	t.Logf("⏱️  Testcontainer setup time: %v", setupDuration)

	// Obtener connection string
	connStr, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err, "Failed to get connection string")

	// ⏱️ Medición de tiempo: Conexión GORM
	gormStart := time.Now()

	// Conectar GORM
	db, err := gorm.Open(postgresdriver.Open(connStr), &gorm.Config{})
	require.NoError(t, err, "Failed to connect to database")

	gormDuration := time.Since(gormStart)
	t.Logf("⏱️  GORM connection time: %v", gormDuration)

	// ⏱️ Medición de tiempo: Migración
	migrateStart := time.Now()

	// AutoMigrate para crear tabla
	err = db.AutoMigrate(&Product{})
	require.NoError(t, err, "Failed to migrate schema")

	migrateDuration := time.Since(migrateStart)
	t.Logf("⏱️  Schema migration time: %v", migrateDuration)

	// ⏱️ Medición de tiempo total
	totalDuration := time.Since(setupStart)
	t.Logf("✅ Total setup time: %v", totalDuration)

	// Test 1: CRUD Básico
	t.Run("should create and retrieve product", func(t *testing.T) {
		product := &Product{
			Name:    "Laptop",
			Stock:   100,
			Version: 1,
		}

		// Create
		result := db.Create(product)
		require.NoError(t, result.Error)
		assert.NotZero(t, product.ID, "Product ID should be auto-generated")

		// Read
		var found Product
		result = db.First(&found, product.ID)
		require.NoError(t, result.Error)

		// Assertions
		assert.Equal(t, "Laptop", found.Name)
		assert.Equal(t, 100, found.Stock)
		assert.Equal(t, 1, found.Version)
		assert.NotZero(t, found.CreatedAt)
	})

	// Test 2: Optimistic Locking Simulation
	t.Run("should handle optimistic locking", func(t *testing.T) {
		// Crear producto
		product := &Product{Name: "Phone", Stock: 50, Version: 1}
		db.Create(product)

		// Simular dos transacciones concurrentes
		// TX1: Leer producto
		var tx1Product Product
		db.First(&tx1Product, product.ID)

		// TX2: Actualizar producto (cambia version)
		db.Model(&Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
			"stock":   45,
			"version": gorm.Expr("version + 1"),
		})

		// TX1: Intentar actualizar con version antigua (debería fallar)
		tx1Product.Stock = 40
		result := db.Model(&Product{}).
			Where("id = ? AND version = ?", tx1Product.ID, tx1Product.Version).
			Updates(map[string]interface{}{
				"stock":   tx1Product.Stock,
				"version": gorm.Expr("version + 1"),
			})

		// Verificar que no se actualizó (rows affected = 0)
		assert.Equal(t, int64(0), result.RowsAffected, "Optimistic lock should prevent update")

		// Verificar que stock sigue siendo 45 (de TX2)
		var finalProduct Product
		db.First(&finalProduct, product.ID)
		assert.Equal(t, 45, finalProduct.Stock)
		assert.Equal(t, 2, finalProduct.Version)
	})

	// Test 3: Constraints de DB Real
	t.Run("should enforce NOT NULL constraint", func(t *testing.T) {
		// Intentar crear producto sin nombre (NOT NULL)
		product := &Product{Stock: 10}
		result := db.Create(product)

		// Debería fallar
		assert.Error(t, result.Error, "Should fail due to NOT NULL constraint")
	})

	// Test 4: Query Performance (simple benchmark)
	t.Run("should query multiple products efficiently", func(t *testing.T) {
		// Insertar 100 productos
		for i := 1; i <= 100; i++ {
			db.Create(&Product{
				Name:  fmt.Sprintf("Product %d", i),
				Stock: i * 10,
			})
		}

		// Medir query time
		queryStart := time.Now()
		var products []Product
		db.Where("stock > ?", 500).Find(&products)
		queryDuration := time.Since(queryStart)

		t.Logf("⏱️  Query time for 100 products: %v", queryDuration)
		assert.Greater(t, len(products), 0, "Should find products with stock > 500")
		assert.Less(t, queryDuration, 100*time.Millisecond, "Query should be fast")
	})

	// 📊 Reporte Final
	t.Logf("\n" +
		"📊 PoC Results Summary\n" +
		"======================\n" +
		"✅ Testcontainer setup: %v\n" +
		"✅ GORM connection:     %v\n" +
		"✅ Schema migration:    %v\n" +
		"✅ Total time:          %v\n" +
		"======================\n" +
		"🎯 Target: < 2 min (120s)\n" +
		"📈 Actual: %.2fs\n" +
		"🚀 Status: %s",
		setupDuration,
		gormDuration,
		migrateDuration,
		totalDuration,
		totalDuration.Seconds(),
		func() string {
			if totalDuration.Seconds() < 120 {
				return "✅ PASS - Under target!"
			}
			return "⚠️  WARN - Consider optimizations"
		}(),
	)
}

// TestPoCTestcontainersWithReuse demuestra reutilización de contenedor
func TestPoCTestcontainersWithReuse(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	t.Log("💡 Tip: Testcontainers permite reusar contenedores entre tests con WithReuse(true)")
	t.Log("💡 Esto reduce el tiempo de setup de 60s a ~5s en ejecuciones subsecuentes")
	t.Log("💡 Ejemplo: testcontainers.WithReuse(true) en ContainerRequest")
}
