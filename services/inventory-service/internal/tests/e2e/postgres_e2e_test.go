//go:build e2e
// +build e2e

package e2e

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	postgresTC "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/repository"
)

const (
	testDBName = "test_inventory"
	testUser   = "test_user"
	testPass   = "test_pass"
)

// setupTestDB initializes a PostgreSQL container and returns the GORM DB connection
func setupTestDB(t *testing.T) (*gorm.DB, func()) {
	ctx := context.Background()

	// Start PostgreSQL container
	postgresContainer, err := postgresTC.Run(ctx,
		"postgres:16-alpine",
		postgresTC.WithDatabase(testDBName),
		postgresTC.WithUsername(testUser),
		postgresTC.WithPassword(testPass),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err, "Failed to start PostgreSQL container")

	// Get connection string
	connStr, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err, "Failed to get connection string")

	// Connect to database
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	require.NoError(t, err, "Failed to connect to test database")

	// Import models for AutoMigrate
	// Note: We need to import the models package to use the model types
	// Run migrations using GORM models (not domain entities)
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS inventory_items (
			id UUID PRIMARY KEY,
			product_id UUID NOT NULL UNIQUE,
			quantity INTEGER NOT NULL CHECK (quantity >= 0),
			reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
			version INTEGER NOT NULL DEFAULT 1,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);

		CREATE TABLE IF NOT EXISTS reservations (
			id UUID PRIMARY KEY,
			inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
			order_id UUID NOT NULL UNIQUE,
			quantity INTEGER NOT NULL CHECK (quantity > 0),
			status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_reservations_inventory ON reservations(inventory_item_id);
		CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
	`).Error
	require.NoError(t, err, "Failed to run migrations")

	// Cleanup function
	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
		if err := postgresContainer.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %v", err)
		}
	}

	return db, cleanup
}

// TestInventoryRepository_E2E_CRUD tests complete CRUD operations for inventory items
func TestInventoryRepository_E2E_CRUD(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	repo := repository.NewInventoryRepository(db)

	t.Run("Create inventory item", func(t *testing.T) {
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)

		err = repo.Save(ctx, item)
		require.NoError(t, err)

		// Verify it was saved
		found, err := repo.FindByProductID(ctx, productID)
		require.NoError(t, err)
		assert.Equal(t, productID, found.ProductID)
		assert.Equal(t, 100, found.Quantity)
		assert.Equal(t, 0, found.Reserved)
		assert.Equal(t, 1, found.Version)
	})

	t.Run("Update inventory item", func(t *testing.T) {
		// Create fresh item for this test
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		err = repo.Save(ctx, item)
		require.NoError(t, err)

		// Fetch fresh item from DB (important for optimistic locking)
		item, err = repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		initialVersion := item.Version

		// Reserve some stock
		err = item.Reserve(20)
		require.NoError(t, err)

		err = repo.Update(ctx, item)
		require.NoError(t, err)

		// Verify update
		updated, err := repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, 20, updated.Reserved)
		assert.Equal(t, 80, updated.Available())
		assert.Equal(t, initialVersion+1, updated.Version) // Version should increment
	})

	t.Run("List inventory items", func(t *testing.T) {
		// Create two items for this test
		productID1 := uuid.New()
		item1, err := entity.NewInventoryItem(productID1, 100)
		require.NoError(t, err)
		err = repo.Save(ctx, item1)
		require.NoError(t, err)

		productID2 := uuid.New()
		item2, err := entity.NewInventoryItem(productID2, 50)
		require.NoError(t, err)
		err = repo.Save(ctx, item2)
		require.NoError(t, err)

		// List all items
		items, err := repo.FindAll(ctx, 10, 0)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(items), 2)
	})

	t.Run("Delete inventory item", func(t *testing.T) {
		// Create item to delete
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		err = repo.Save(ctx, item)
		require.NoError(t, err)

		err = repo.Delete(ctx, item.ID)
		require.NoError(t, err)

		// Verify deletion
		_, err = repo.FindByID(ctx, item.ID)
		assert.Error(t, err) // Should return not found error
	})
}

// TestReservationRepository_E2E_CRUD tests complete CRUD operations for reservations
func TestReservationRepository_E2E_CRUD(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	inventoryRepo := repository.NewInventoryRepository(db)
	reservationRepo := repository.NewReservationRepository(db)

	// Create inventory item first
	productID := uuid.New()
	item, err := entity.NewInventoryItem(productID, 100)
	require.NoError(t, err)
	err = inventoryRepo.Save(ctx, item)
	require.NoError(t, err)

	t.Run("Create reservation", func(t *testing.T) {
		orderID := uuid.New()
		// Use item.ID (inventory_item_id) not productID
		reservation, err := entity.NewReservation(item.ID, orderID, 10)
		require.NoError(t, err)

		err = reservationRepo.Save(ctx, reservation)
		require.NoError(t, err)

		// Verify it was saved
		found, err := reservationRepo.FindByOrderID(ctx, orderID)
		require.NoError(t, err)
		assert.Equal(t, orderID, found.OrderID)
		assert.Equal(t, item.ID, found.InventoryItemID)
		assert.Equal(t, 10, found.Quantity)
		assert.Equal(t, entity.ReservationPending, found.Status)
	})

	t.Run("Update reservation status", func(t *testing.T) {
		// Create fresh reservation for this test with very long expiration
		orderID := uuid.New()
		reservation, err := entity.NewReservationWithDuration(item.ID, orderID, 10, 24*time.Hour)
		require.NoError(t, err)
		err = reservationRepo.Save(ctx, reservation)
		require.NoError(t, err)

		// Now update it
		reservation, err = reservationRepo.FindByOrderID(ctx, orderID)
		require.NoError(t, err)

		err = reservation.Confirm()
		require.NoError(t, err)

		err = reservationRepo.Update(ctx, reservation)
		require.NoError(t, err)

		// Verify update
		updated, err := reservationRepo.FindByOrderID(ctx, orderID)
		require.NoError(t, err)
		assert.Equal(t, entity.ReservationConfirmed, updated.Status)
	})

	t.Run("Find reservations by inventory item", func(t *testing.T) {
		// Create another reservation for the same inventory item
		orderID2 := uuid.New()
		reservation2, err := entity.NewReservation(item.ID, orderID2, 5)
		require.NoError(t, err)
		err = reservationRepo.Save(ctx, reservation2)
		require.NoError(t, err)

		// Find all pending reservations for this inventory item
		reservations, err := reservationRepo.FindByInventoryItemID(ctx, item.ID, entity.ReservationPending)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(reservations), 1) // At least the new one (orderID was confirmed earlier)
	})

	t.Run("Delete reservation", func(t *testing.T) {
		// Create fresh reservation for this test
		orderID := uuid.New()
		reservation, err := entity.NewReservation(item.ID, orderID, 10)
		require.NoError(t, err)
		err = reservationRepo.Save(ctx, reservation)
		require.NoError(t, err)

		// Now delete it
		err = reservationRepo.Delete(ctx, reservation.ID)
		require.NoError(t, err)

		// Verify deletion
		_, err = reservationRepo.FindByOrderID(ctx, orderID)
		assert.Error(t, err) // Should return not found error
	})
}

// TestOptimisticLocking_E2E tests optimistic locking with concurrent updates
func TestOptimisticLocking_E2E(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	repo := repository.NewInventoryRepository(db)

	t.Run("Concurrent update should fail due to version mismatch", func(t *testing.T) {
		// Create fresh item for this test
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		err = repo.Save(ctx, item)
		require.NoError(t, err)

		// First read
		item1, err := repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		originalVersion := item1.Version

		// Second read (same version)
		item2, err := repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, originalVersion, item2.Version)

		// First update succeeds
		err = item1.Reserve(10)
		require.NoError(t, err)
		err = repo.Update(ctx, item1)
		require.NoError(t, err)

		// Second update should fail (stale version)
		err = item2.Reserve(20)
		require.NoError(t, err)
		err = repo.Update(ctx, item2)
		assert.Error(t, err, "Second update should fail due to stale version")

		// Verify only first update was applied
		current, err := repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, 10, current.Reserved)
		assert.Equal(t, originalVersion+1, current.Version)
	})

	t.Run("Retry after failed optimistic lock should succeed", func(t *testing.T) {
		// Create fresh item for this test
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		err = repo.Save(ctx, item)
		require.NoError(t, err)

		// Read fresh version (important: this gets the latest version from DB)
		item, err = repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		currentReserved := item.Reserved

		// Update should succeed with fresh version
		err = item.Reserve(15)
		require.NoError(t, err)
		err = repo.Update(ctx, item)
		require.NoError(t, err)

		// Verify update
		updated, err := repo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, currentReserved+15, updated.Reserved) // Previous + 15
	})
}

// TestExpiredReservations_E2E tests finding and cleaning expired reservations
func TestExpiredReservations_E2E(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	inventoryRepo := repository.NewInventoryRepository(db)
	reservationRepo := repository.NewReservationRepository(db)

	// Create inventory item
	productID := uuid.New()
	item, err := entity.NewInventoryItem(productID, 100)
	require.NoError(t, err)
	err = inventoryRepo.Save(ctx, item)
	require.NoError(t, err)

	t.Run("Find expired reservations", func(t *testing.T) {
		// Create active reservation (expires in future)
		activeOrder := uuid.New()
		activeReservation, err := entity.NewReservationWithDuration(
			item.ID,
			activeOrder,
			10,
			1*time.Hour,
		)
		require.NoError(t, err)
		err = reservationRepo.Save(ctx, activeReservation)
		require.NoError(t, err)

		// Create expired reservation (already expired)
		expiredOrder := uuid.New()
		expiredReservation := &entity.Reservation{
			ID:              uuid.New(),
			InventoryItemID: item.ID,
			OrderID:         expiredOrder,
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       time.Now().Add(-1 * time.Hour), // Already expired
			CreatedAt:       time.Now().Add(-2 * time.Hour),
			UpdatedAt:       time.Now().Add(-2 * time.Hour),
		}
		err = reservationRepo.Save(ctx, expiredReservation)
		require.NoError(t, err)

		// Find expired reservations
		expired, err := reservationRepo.FindExpired(ctx, 10)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(expired), 1)

		// Verify the expired one is in the list
		foundExpired := false
		for _, r := range expired {
			if r.OrderID == expiredOrder {
				foundExpired = true
				assert.True(t, r.IsExpired())
				assert.True(t, r.IsPending())
			}
		}
		assert.True(t, foundExpired, "Expired reservation should be in the result")
	})
}

// TestCompleteInventoryWorkflow_E2E tests a complete reservation workflow
func TestCompleteInventoryWorkflow_E2E(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	inventoryRepo := repository.NewInventoryRepository(db)
	reservationRepo := repository.NewReservationRepository(db)

	t.Run("Complete order workflow: reserve -> confirm -> deduct stock", func(t *testing.T) {
		// 1. Create inventory for this test
		productID := uuid.New()
		item, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		err = inventoryRepo.Save(ctx, item)
		require.NoError(t, err)

		// 2. Create reservation (customer adds to cart) with very long expiration for testing
		orderID := uuid.New()
		reservation, err := entity.NewReservationWithDuration(item.ID, orderID, 15, 24*time.Hour)
		require.NoError(t, err)
		err = reservationRepo.Save(ctx, reservation)
		require.NoError(t, err)

		// 3. Reserve stock in inventory (fetch fresh to get correct version)
		item, err = inventoryRepo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		err = item.Reserve(15)
		require.NoError(t, err)
		err = inventoryRepo.Update(ctx, item)
		require.NoError(t, err)

		// Verify reservation state
		item, err = inventoryRepo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, 100, item.Quantity)
		assert.Equal(t, 15, item.Reserved)
		assert.Equal(t, 85, item.Available())

		// 4. Confirm order (customer pays)
		reservation, err = reservationRepo.FindByOrderID(ctx, orderID)
		require.NoError(t, err)
		err = reservation.Confirm()
		require.NoError(t, err)
		err = reservationRepo.Update(ctx, reservation)
		require.NoError(t, err)

		// 5. Confirm reservation in inventory (deduct from both reserved and quantity)
		// Fetch fresh item to get latest version
		item, err = inventoryRepo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		err = item.ConfirmReservation(15)
		require.NoError(t, err)
		err = inventoryRepo.Update(ctx, item)
		require.NoError(t, err)

		// Verify final state
		item, err = inventoryRepo.FindByID(ctx, item.ID)
		require.NoError(t, err)
		assert.Equal(t, 85, item.Quantity)    // 100 - 15
		assert.Equal(t, 0, item.Reserved)     // Released after confirmation
		assert.Equal(t, 85, item.Available()) // Same as quantity now

		reservation, err = reservationRepo.FindByOrderID(ctx, orderID)
		require.NoError(t, err)
		assert.Equal(t, entity.ReservationConfirmed, reservation.Status)
	})
}
