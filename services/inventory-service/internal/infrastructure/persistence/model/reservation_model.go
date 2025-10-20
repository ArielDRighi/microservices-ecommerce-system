package model

import (
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReservationModel is the GORM model for reservations table.
// It maps to the domain entity Reservation for persistence.
type ReservationModel struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	InventoryItemID uuid.UUID `gorm:"type:uuid;not null;index:idx_reservations_inventory_item"`
	OrderID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_reservations_order"`
	Quantity        int       `gorm:"not null;check:quantity > 0"`
	Status          string    `gorm:"type:varchar(20);not null;default:'pending';index:idx_reservations_status"`
	ExpiresAt       time.Time `gorm:"not null;index:idx_reservations_expires_at"`
	CreatedAt       time.Time `gorm:"not null"`
	UpdatedAt       time.Time `gorm:"not null"`
}

// TableName specifies the table name for ReservationModel
func (ReservationModel) TableName() string {
	return "reservations"
}

// BeforeCreate GORM hook - generates UUID if not set
func (m *ReservationModel) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.Status == "" {
		m.Status = string(entity.ReservationPending)
	}
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	return nil
}

// BeforeUpdate GORM hook - updates UpdatedAt timestamp
func (m *ReservationModel) BeforeUpdate(tx *gorm.DB) error {
	m.UpdatedAt = time.Now().UTC()
	return nil
}

// ToEntity converts GORM model to domain entity
func (m *ReservationModel) ToEntity() *entity.Reservation {
	return &entity.Reservation{
		ID:              m.ID,
		InventoryItemID: m.InventoryItemID,
		OrderID:         m.OrderID,
		Quantity:        m.Quantity,
		Status:          entity.ReservationStatus(m.Status),
		ExpiresAt:       m.ExpiresAt,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}

// FromEntity converts domain entity to GORM model
func (m *ReservationModel) FromEntity(reservation *entity.Reservation) {
	m.ID = reservation.ID
	m.InventoryItemID = reservation.InventoryItemID
	m.OrderID = reservation.OrderID
	m.Quantity = reservation.Quantity
	m.Status = string(reservation.Status)
	m.ExpiresAt = reservation.ExpiresAt
	m.CreatedAt = reservation.CreatedAt
	m.UpdatedAt = reservation.UpdatedAt
}

// NewReservationModelFromEntity creates a new GORM model from domain entity
func NewReservationModelFromEntity(reservation *entity.Reservation) *ReservationModel {
	model := &ReservationModel{}
	model.FromEntity(reservation)
	return model
}
