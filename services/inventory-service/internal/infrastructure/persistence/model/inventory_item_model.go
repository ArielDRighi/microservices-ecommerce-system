package model

import (
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// InventoryItemModel is the GORM model for inventory_items table.
// It maps to the domain entity InventoryItem for persistence.
type InventoryItemModel struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ProductID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_inventory_product"`
	Quantity  int       `gorm:"not null;check:quantity >= 0"`
	Reserved  int       `gorm:"not null;default:0;check:reserved >= 0"`
	Version   int       `gorm:"not null;default:1"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

// TableName specifies the table name for InventoryItemModel
func (InventoryItemModel) TableName() string {
	return "inventory_items"
}

// BeforeCreate GORM hook - generates UUID if not set
func (m *InventoryItemModel) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.Version == 0 {
		m.Version = 1
	}
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	return nil
}

// BeforeUpdate GORM hook - updates UpdatedAt timestamp
func (m *InventoryItemModel) BeforeUpdate(tx *gorm.DB) error {
	m.UpdatedAt = time.Now().UTC()
	return nil
}

// ToEntity converts GORM model to domain entity
func (m *InventoryItemModel) ToEntity() *entity.InventoryItem {
	return &entity.InventoryItem{
		ID:        m.ID,
		ProductID: m.ProductID,
		Quantity:  m.Quantity,
		Reserved:  m.Reserved,
		Version:   m.Version,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

// FromEntity converts domain entity to GORM model
func (m *InventoryItemModel) FromEntity(item *entity.InventoryItem) {
	m.ID = item.ID
	m.ProductID = item.ProductID
	m.Quantity = item.Quantity
	m.Reserved = item.Reserved
	m.Version = item.Version
	m.CreatedAt = item.CreatedAt
	m.UpdatedAt = item.UpdatedAt
}

// NewInventoryItemModelFromEntity creates a new GORM model from domain entity
func NewInventoryItemModelFromEntity(item *entity.InventoryItem) *InventoryItemModel {
	model := &InventoryItemModel{}
	model.FromEntity(item)
	return model
}
