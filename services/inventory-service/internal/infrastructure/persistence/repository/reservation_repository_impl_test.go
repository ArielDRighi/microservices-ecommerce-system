package repository

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	domainErrors "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupReservationTestDB creates a PostgreSQL testcontainer and returns a GORM DB connection
func setupReservationTestDB(t *testing.T) (*gorm.DB, func()) {
	ctx := context.Background()

	// Create PostgreSQL container
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "testuser",
			"POSTGRES_PASSWORD": "testpass",
			"POSTGRES_DB":       "testdb",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
	}

	postgresContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err)

	// Get container host and port
	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	// Create DSN
	dsn := "host=" + host + " user=testuser password=testpass dbname=testdb port=" + port.Port() + " sslmode=disable"

	// Open GORM connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	// Auto-migrate the models
	err = db.AutoMigrate(&model.ReservationModel{})
	require.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
		postgresContainer.Terminate(ctx)
	}

	return db, cleanup
}

func TestReservationRepositoryImpl_FindByID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	// Create test data
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         uuid.New(),
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	require.NoError(t, err)

	// Test: Find existing reservation
	found, err := repo.FindByID(ctx, reservation.ID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, reservation.ID, found.ID)
	assert.Equal(t, reservation.OrderID, found.OrderID)
	assert.Equal(t, reservation.Quantity, found.Quantity)

	// Test: Find non-existing reservation
	notFound, err := repo.FindByID(ctx, uuid.New())
	assert.Error(t, err)
	assert.Nil(t, notFound)
	assert.Equal(t, domainErrors.ErrReservationNotFound, err)
}

func TestReservationRepositoryImpl_FindByOrderID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	// Create test data
	orderID := uuid.New()
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         orderID,
		Quantity:        3,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	require.NoError(t, err)

	// Test: Find by existing order ID
	found, err := repo.FindByOrderID(ctx, orderID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, orderID, found.OrderID)

	// Test: Find by non-existing order ID
	notFound, err := repo.FindByOrderID(ctx, uuid.New())
	assert.Error(t, err)
	assert.Nil(t, notFound)
	assert.Equal(t, domainErrors.ErrReservationNotFound, err)
}

func TestReservationRepositoryImpl_Save(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	// Test: Save new reservation
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         uuid.New(),
		Quantity:        10,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	assert.NoError(t, err)

	// Verify reservation was saved
	found, err := repo.FindByID(ctx, reservation.ID)
	assert.NoError(t, err)
	assert.Equal(t, reservation.Quantity, found.Quantity)

	// Test: Save duplicate order ID (should fail)
	duplicateReservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         reservation.OrderID, // Same order ID
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err = repo.Save(ctx, duplicateReservation)
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrReservationAlreadyExists, err)
}

func TestReservationRepositoryImpl_Update(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	// Create initial reservation
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         uuid.New(),
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	require.NoError(t, err)

	// Test: Successful update
	reservation.Status = entity.ReservationConfirmed
	reservation.Quantity = 7
	reservation.UpdatedAt = time.Now().UTC()

	err = repo.Update(ctx, reservation)
	assert.NoError(t, err)

	// Verify update
	found, err := repo.FindByID(ctx, reservation.ID)
	assert.NoError(t, err)
	assert.Equal(t, entity.ReservationConfirmed, found.Status)
	assert.Equal(t, 7, found.Quantity)

	// Test: Update non-existing reservation
	nonExisting := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         uuid.New(),
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err = repo.Update(ctx, nonExisting)
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrReservationNotFound, err)
}

func TestReservationRepositoryImpl_Delete(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	// Create test reservation
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         uuid.New(),
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	require.NoError(t, err)

	// Test: Delete existing reservation
	err = repo.Delete(ctx, reservation.ID)
	assert.NoError(t, err)

	// Verify deletion
	found, err := repo.FindByID(ctx, reservation.ID)
	assert.Error(t, err)
	assert.Nil(t, found)

	// Test: Delete non-existing reservation
	err = repo.Delete(ctx, uuid.New())
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrReservationNotFound, err)
}

func TestReservationRepositoryImpl_FindByInventoryItemID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	inventoryItemID := uuid.New()

	// Create multiple reservations for same inventory item with different statuses
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationConfirmed,
			ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationPending,
			ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find all reservations (no status filter)
	found, err := repo.FindByInventoryItemID(ctx, inventoryItemID, "")
	assert.NoError(t, err)
	assert.Equal(t, 3, len(found))

	// Test: Find only pending reservations
	pending, err := repo.FindByInventoryItemID(ctx, inventoryItemID, entity.ReservationPending)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(pending))

	// Test: Find only confirmed reservations
	confirmed, err := repo.FindByInventoryItemID(ctx, inventoryItemID, entity.ReservationConfirmed)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(confirmed))
}

func TestReservationRepositoryImpl_FindExpired(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create reservations: some expired, some not
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-10 * time.Minute), // Expired
			CreatedAt:       now.Add(-25 * time.Minute),
			UpdatedAt:       now.Add(-25 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-5 * time.Minute), // Expired
			CreatedAt:       now.Add(-20 * time.Minute),
			UpdatedAt:       now.Add(-20 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(10 * time.Minute), // Not expired
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        4,
			Status:          entity.ReservationConfirmed, // Confirmed (not pending)
			ExpiresAt:       now.Add(-2 * time.Minute),
			CreatedAt:       now.Add(-17 * time.Minute),
			UpdatedAt:       now.Add(-17 * time.Minute),
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find all expired reservations (should find 2)
	expired, err := repo.FindExpired(ctx, 0)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(expired))

	// Test: Find expired with limit
	expiredLimited, err := repo.FindExpired(ctx, 1)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(expiredLimited))
}

func TestReservationRepositoryImpl_FindExpiringBetween(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create reservations expiring at different times
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(5 * time.Minute), // Within range
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(8 * time.Minute), // Within range
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(20 * time.Minute), // Outside range
			CreatedAt:       now,
			UpdatedAt:       now,
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find reservations expiring between now and +10 minutes
	expiring, err := repo.FindExpiringBetween(ctx, now, now.Add(10*time.Minute))
	assert.NoError(t, err)
	assert.Equal(t, 2, len(expiring))
}

func TestReservationRepositoryImpl_FindActiveByInventoryItemID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	inventoryItemID := uuid.New()
	now := time.Now().UTC()

	// Create reservations: active, expired, and confirmed
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(10 * time.Minute), // Active
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-5 * time.Minute), // Expired (not active)
			CreatedAt:       now.Add(-20 * time.Minute),
			UpdatedAt:       now.Add(-20 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationConfirmed, // Confirmed (not active)
			ExpiresAt:       now.Add(10 * time.Minute),
			CreatedAt:       now,
			UpdatedAt:       now,
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find only active reservations (pending + not expired)
	active, err := repo.FindActiveByInventoryItemID(ctx, inventoryItemID)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(active)) // Only the first one
}

func TestReservationRepositoryImpl_FindByStatus(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create reservations with different statuses
	for i := 0; i < 5; i++ {
		status := entity.ReservationPending
		if i%2 == 0 {
			status = entity.ReservationConfirmed
		}

		res := &entity.Reservation{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        i + 1,
			Status:          status,
			ExpiresAt:       now.Add(15 * time.Minute),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find pending reservations
	pending, err := repo.FindByStatus(ctx, entity.ReservationPending, 0, 0)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(pending))

	// Test: Find confirmed reservations
	confirmed, err := repo.FindByStatus(ctx, entity.ReservationConfirmed, 0, 0)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(confirmed))

	// Test: Find with pagination
	confirmedPaged, err := repo.FindByStatus(ctx, entity.ReservationConfirmed, 2, 0)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(confirmedPaged))
}

func TestReservationRepositoryImpl_CountByStatus(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create 3 pending and 2 confirmed reservations
	for i := 0; i < 5; i++ {
		status := entity.ReservationPending
		if i >= 3 {
			status = entity.ReservationConfirmed
		}

		res := &entity.Reservation{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        i + 1,
			Status:          status,
			ExpiresAt:       now.Add(15 * time.Minute),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Count pending
	pendingCount, err := repo.CountByStatus(ctx, entity.ReservationPending)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), pendingCount)

	// Test: Count confirmed
	confirmedCount, err := repo.CountByStatus(ctx, entity.ReservationConfirmed)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), confirmedCount)
}

func TestReservationRepositoryImpl_CountActiveByInventoryItemID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	inventoryItemID := uuid.New()
	now := time.Now().UTC()

	// Create 2 active, 1 expired, 1 confirmed
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(10 * time.Minute), // Active
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(5 * time.Minute), // Active
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-5 * time.Minute), // Expired (not active)
			CreatedAt:       now.Add(-20 * time.Minute),
			UpdatedAt:       now.Add(-20 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: inventoryItemID,
			OrderID:         uuid.New(),
			Quantity:        4,
			Status:          entity.ReservationConfirmed, // Not active
			ExpiresAt:       now.Add(10 * time.Minute),
			CreatedAt:       now,
			UpdatedAt:       now,
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Count active reservations (should be 2)
	count, err := repo.CountActiveByInventoryItemID(ctx, inventoryItemID)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), count)
}

func TestReservationRepositoryImpl_ExistsByOrderID(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	orderID := uuid.New()
	reservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: uuid.New(),
		OrderID:         orderID,
		Quantity:        5,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	err := repo.Save(ctx, reservation)
	require.NoError(t, err)

	// Test: Exists by existing order ID
	exists, err := repo.ExistsByOrderID(ctx, orderID)
	assert.NoError(t, err)
	assert.True(t, exists)

	// Test: Exists by non-existing order ID
	exists, err = repo.ExistsByOrderID(ctx, uuid.New())
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestReservationRepositoryImpl_FindAll(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create 5 reservations
	for i := 0; i < 5; i++ {
		res := &entity.Reservation{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        i + 1,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(15 * time.Minute),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Find all without pagination
	all, err := repo.FindAll(ctx, 0, 0)
	assert.NoError(t, err)
	assert.Equal(t, 5, len(all))

	// Test: Find all with pagination (limit 3)
	limited, err := repo.FindAll(ctx, 3, 0)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(limited))

	// Test: Find all with offset
	offset, err := repo.FindAll(ctx, 2, 2)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(offset))
}

func TestReservationRepositoryImpl_DeleteExpired(t *testing.T) {
	db, cleanup := setupReservationTestDB(t)
	defer cleanup()

	repo := NewReservationRepository(db)
	ctx := context.Background()

	now := time.Now().UTC()

	// Create reservations: 2 expired pending, 1 not expired, 1 expired confirmed
	reservations := []*entity.Reservation{
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        5,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-10 * time.Minute), // Expired pending
			CreatedAt:       now.Add(-25 * time.Minute),
			UpdatedAt:       now.Add(-25 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        3,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(-5 * time.Minute), // Expired pending
			CreatedAt:       now.Add(-20 * time.Minute),
			UpdatedAt:       now.Add(-20 * time.Minute),
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        2,
			Status:          entity.ReservationPending,
			ExpiresAt:       now.Add(10 * time.Minute), // Not expired
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			ID:              uuid.New(),
			InventoryItemID: uuid.New(),
			OrderID:         uuid.New(),
			Quantity:        4,
			Status:          entity.ReservationConfirmed,
			ExpiresAt:       now.Add(-2 * time.Minute), // Expired confirmed (should NOT be deleted)
			CreatedAt:       now.Add(-17 * time.Minute),
			UpdatedAt:       now.Add(-17 * time.Minute),
		},
	}

	for _, res := range reservations {
		err := repo.Save(ctx, res)
		require.NoError(t, err)
	}

	// Test: Delete expired pending reservations (should delete 2)
	deleted, err := repo.DeleteExpired(ctx)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), deleted)

	// Verify remaining reservations (should be 2: 1 not expired + 1 expired confirmed)
	all, err := repo.FindAll(ctx, 0, 0)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(all))
}
