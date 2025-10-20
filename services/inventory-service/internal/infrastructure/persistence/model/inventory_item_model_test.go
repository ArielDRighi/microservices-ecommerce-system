package model

import (
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInventoryItemModel_TableName(t *testing.T) {
	model := InventoryItemModel{}
	assert.Equal(t, "inventory_items", model.TableName())
}

func TestInventoryItemModel_ToEntity(t *testing.T) {
	// Arrange
	now := time.Now().UTC()
	productID := uuid.New()
	itemID := uuid.New()

	model := &InventoryItemModel{
		ID:        itemID,
		ProductID: productID,
		Quantity:  100,
		Reserved:  20,
		Version:   5,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Act
	item := model.ToEntity()

	// Assert
	assert.NotNil(t, item)
	assert.Equal(t, itemID, item.ID)
	assert.Equal(t, productID, item.ProductID)
	assert.Equal(t, 100, item.Quantity)
	assert.Equal(t, 20, item.Reserved)
	assert.Equal(t, 5, item.Version)
	assert.Equal(t, now.Unix(), item.CreatedAt.Unix())
	assert.Equal(t, now.Unix(), item.UpdatedAt.Unix())
}

func TestInventoryItemModel_FromEntity(t *testing.T) {
	// Arrange
	productID := uuid.New()
	item, err := entity.NewInventoryItem(productID, 100)
	require.NoError(t, err)
	item.Reserve(20)

	model := &InventoryItemModel{}

	// Act
	model.FromEntity(item)

	// Assert
	assert.Equal(t, item.ID, model.ID)
	assert.Equal(t, item.ProductID, model.ProductID)
	assert.Equal(t, item.Quantity, model.Quantity)
	assert.Equal(t, item.Reserved, model.Reserved)
	assert.Equal(t, item.Version, model.Version)
	assert.Equal(t, item.CreatedAt.Unix(), model.CreatedAt.Unix())
	assert.Equal(t, item.UpdatedAt.Unix(), model.UpdatedAt.Unix())
}

func TestNewInventoryItemModelFromEntity(t *testing.T) {
	// Arrange
	productID := uuid.New()
	item, err := entity.NewInventoryItem(productID, 50)
	require.NoError(t, err)

	// Act
	model := NewInventoryItemModelFromEntity(item)

	// Assert
	assert.NotNil(t, model)
	assert.Equal(t, item.ID, model.ID)
	assert.Equal(t, item.ProductID, model.ProductID)
	assert.Equal(t, item.Quantity, model.Quantity)
	assert.Equal(t, item.Reserved, model.Reserved)
	assert.Equal(t, item.Version, model.Version)
}

func TestInventoryItemModel_Conversion_RoundTrip(t *testing.T) {
	// Test that converting entity -> model -> entity preserves data
	t.Run("should preserve all fields in round-trip conversion", func(t *testing.T) {
		// Arrange - Create original entity
		productID := uuid.New()
		originalItem, err := entity.NewInventoryItem(productID, 100)
		require.NoError(t, err)
		originalItem.Reserve(30)

		// Act - Convert to model and back
		model := NewInventoryItemModelFromEntity(originalItem)
		convertedItem := model.ToEntity()

		// Assert - All fields should match
		assert.Equal(t, originalItem.ID, convertedItem.ID)
		assert.Equal(t, originalItem.ProductID, convertedItem.ProductID)
		assert.Equal(t, originalItem.Quantity, convertedItem.Quantity)
		assert.Equal(t, originalItem.Reserved, convertedItem.Reserved)
		assert.Equal(t, originalItem.Version, convertedItem.Version)
		assert.Equal(t, originalItem.Available(), convertedItem.Available())
	})
}
