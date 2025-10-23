package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	domainErrors "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
	"github.com/jackc/pgconn"
	"gorm.io/gorm"
)

// ReservationRepositoryImpl is the GORM implementation of ReservationRepository
type ReservationRepositoryImpl struct {
	db *gorm.DB
}

// NewReservationRepository creates a new instance of ReservationRepositoryImpl
func NewReservationRepository(db *gorm.DB) *ReservationRepositoryImpl {
	return &ReservationRepositoryImpl{
		db: db,
	}
}

// FindByID retrieves a reservation by its ID
func (r *ReservationRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error) {
	var reservationModel model.ReservationModel

	result := r.db.WithContext(ctx).Where("id = ?", id).First(&reservationModel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, domainErrors.ErrReservationNotFound
		}
		return nil, fmt.Errorf("failed to find reservation by ID: %w", result.Error)
	}

	return reservationModel.ToEntity(), nil
}

// FindByOrderID retrieves a reservation by order ID
func (r *ReservationRepositoryImpl) FindByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Reservation, error) {
	var reservationModel model.ReservationModel

	result := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&reservationModel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, domainErrors.ErrReservationNotFound
		}
		return nil, fmt.Errorf("failed to find reservation by order ID: %w", result.Error)
	}

	return reservationModel.ToEntity(), nil
}

// Save creates a new reservation in the repository
func (r *ReservationRepositoryImpl) Save(ctx context.Context, reservation *entity.Reservation) error {
	reservationModel := model.NewReservationModelFromEntity(reservation)

	result := r.db.WithContext(ctx).Create(reservationModel)
	if result.Error != nil {
		// Check for unique constraint violation on order_id (PostgreSQL error code 23505)
		var pgErr *pgconn.PgError
		if errors.As(result.Error, &pgErr) && pgErr.Code == "23505" {
			return domainErrors.ErrReservationAlreadyExists
		}
		// Also check for GORM wrapping by checking error string
		if errMsg := result.Error.Error(); errMsg != "" {
			if pgErr != nil || containsReservationConstraintViolation(errMsg) {
				return domainErrors.ErrReservationAlreadyExists
			}
		}
		return fmt.Errorf("failed to save reservation: %w", result.Error)
	}

	return nil
}

// containsReservationConstraintViolation checks if error message contains PostgreSQL duplicate key constraint for reservations
func containsReservationConstraintViolation(errMsg string) bool {
	return strings.Contains(errMsg, "duplicate key value violates unique constraint") &&
		(strings.Contains(errMsg, "idx_reservation_order") || strings.Contains(errMsg, "SQLSTATE 23505"))
}

// Update updates an existing reservation
func (r *ReservationRepositoryImpl) Update(ctx context.Context, reservation *entity.Reservation) error {
	reservationModel := model.NewReservationModelFromEntity(reservation)

	result := r.db.WithContext(ctx).
		Model(&model.ReservationModel{}).
		Where("id = ?", reservation.ID).
		Updates(map[string]interface{}{
			"inventory_item_id": reservationModel.InventoryItemID,
			"order_id":          reservationModel.OrderID,
			"quantity":          reservationModel.Quantity,
			"status":            reservationModel.Status,
			"expires_at":        reservationModel.ExpiresAt,
			"updated_at":        reservationModel.UpdatedAt,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to update reservation: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return domainErrors.ErrReservationNotFound
	}

	return nil
}

// Delete removes a reservation from the repository
func (r *ReservationRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.ReservationModel{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete reservation: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return domainErrors.ErrReservationNotFound
	}

	return nil
}

// FindByInventoryItemID retrieves all reservations for a specific inventory item
func (r *ReservationRepositoryImpl) FindByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID, status entity.ReservationStatus) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	query := r.db.WithContext(ctx).Where("inventory_item_id = ?", inventoryItemID)

	// Filter by status if provided (not empty)
	if status != "" {
		query = query.Where("status = ?", string(status))
	}

	result := query.Find(&reservationModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find reservations by inventory item ID: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// FindExpired retrieves all pending reservations that have passed their expiry time
func (r *ReservationRepositoryImpl) FindExpired(ctx context.Context, limit int) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	query := r.db.WithContext(ctx).
		Where("status = ?", string(entity.ReservationPending)).
		Where("expires_at < ?", time.Now().UTC()).
		Order("expires_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	result := query.Find(&reservationModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find expired reservations: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// FindExpiringBetween retrieves pending reservations expiring within a time range
func (r *ReservationRepositoryImpl) FindExpiringBetween(ctx context.Context, start, end time.Time) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	result := r.db.WithContext(ctx).
		Where("status = ?", string(entity.ReservationPending)).
		Where("expires_at >= ? AND expires_at <= ?", start.UTC(), end.UTC()).
		Order("expires_at ASC").
		Find(&reservationModels)

	if result.Error != nil {
		return nil, fmt.Errorf("failed to find expiring reservations: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// FindActiveByInventoryItemID retrieves all active (pending, non-expired) reservations for a specific inventory item
func (r *ReservationRepositoryImpl) FindActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	result := r.db.WithContext(ctx).
		Where("inventory_item_id = ?", inventoryItemID).
		Where("status = ?", string(entity.ReservationPending)).
		Where("expires_at > ?", time.Now().UTC()).
		Find(&reservationModels)

	if result.Error != nil {
		return nil, fmt.Errorf("failed to find active reservations: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// FindByStatus retrieves all reservations with a specific status
func (r *ReservationRepositoryImpl) FindByStatus(ctx context.Context, status entity.ReservationStatus, limit, offset int) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	query := r.db.WithContext(ctx).Where("status = ?", string(status))

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&reservationModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find reservations by status: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// CountByStatus returns the count of reservations by status
func (r *ReservationRepositoryImpl) CountByStatus(ctx context.Context, status entity.ReservationStatus) (int64, error) {
	var count int64

	result := r.db.WithContext(ctx).
		Model(&model.ReservationModel{}).
		Where("status = ?", string(status)).
		Count(&count)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to count reservations by status: %w", result.Error)
	}

	return count, nil
}

// CountActiveByInventoryItemID returns the count of active reservations for an inventory item
func (r *ReservationRepositoryImpl) CountActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) (int64, error) {
	var count int64

	result := r.db.WithContext(ctx).
		Model(&model.ReservationModel{}).
		Where("inventory_item_id = ?", inventoryItemID).
		Where("status = ?", string(entity.ReservationPending)).
		Where("expires_at > ?", time.Now().UTC()).
		Count(&count)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to count active reservations: %w", result.Error)
	}

	return count, nil
}

// ExistsByOrderID checks if a reservation exists for an order
func (r *ReservationRepositoryImpl) ExistsByOrderID(ctx context.Context, orderID uuid.UUID) (bool, error) {
	var count int64

	result := r.db.WithContext(ctx).
		Model(&model.ReservationModel{}).
		Where("order_id = ?", orderID).
		Count(&count)

	if result.Error != nil {
		return false, fmt.Errorf("failed to check if reservation exists: %w", result.Error)
	}

	return count > 0, nil
}

// FindAll retrieves all reservations with optional pagination
func (r *ReservationRepositoryImpl) FindAll(ctx context.Context, limit, offset int) ([]*entity.Reservation, error) {
	var reservationModels []model.ReservationModel

	query := r.db.WithContext(ctx)

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&reservationModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find all reservations: %w", result.Error)
	}

	reservations := make([]*entity.Reservation, len(reservationModels))
	for i, reservationModel := range reservationModels {
		reservations[i] = reservationModel.ToEntity()
	}

	return reservations, nil
}

// DeleteExpired removes all expired pending reservations from the repository
func (r *ReservationRepositoryImpl) DeleteExpired(ctx context.Context) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("status = ?", string(entity.ReservationPending)).
		Where("expires_at < ?", time.Now().UTC()).
		Delete(&model.ReservationModel{})

	if result.Error != nil {
		return 0, fmt.Errorf("failed to delete expired reservations: %w", result.Error)
	}

	return result.RowsAffected, nil
}
