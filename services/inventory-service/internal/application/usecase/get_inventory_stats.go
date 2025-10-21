package usecase

import (
	"context"
	"fmt"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
)

// InventoryStats contiene estadísticas agregadas del inventario
type InventoryStats struct {
	TotalItems       int64   `json:"total_items"`
	TotalQuantity    int64   `json:"total_quantity"`
	TotalReserved    int64   `json:"total_reserved"`
	TotalAvailable   int64   `json:"total_available"`
	LowStockCount    int64   `json:"low_stock_count"` // Items con available < 10
	AverageAvailable float64 `json:"average_available"`
	ReservationRate  float64 `json:"reservation_rate"` // Porcentaje: (reserved / quantity) * 100
}

// GetInventoryStatsUseCase obtiene estadísticas globales del inventario
type GetInventoryStatsUseCase struct {
	inventoryRepo repository.InventoryRepository
}

// NewGetInventoryStatsUseCase crea una nueva instancia del use case
func NewGetInventoryStatsUseCase(inventoryRepo repository.InventoryRepository) *GetInventoryStatsUseCase {
	return &GetInventoryStatsUseCase{
		inventoryRepo: inventoryRepo,
	}
}

// Execute calcula y retorna las estadísticas del inventario
func (uc *GetInventoryStatsUseCase) Execute(ctx context.Context) (*InventoryStats, error) {
	// Fetch all inventory items (sin paginación para cálculo correcto)
	items, err := uc.inventoryRepo.FindAll(ctx, 0, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch inventory items: %w", err)
	}

	// Inicializar estadísticas
	stats := &InventoryStats{
		TotalItems:       int64(len(items)),
		TotalQuantity:    0,
		TotalReserved:    0,
		TotalAvailable:   0,
		LowStockCount:    0,
		AverageAvailable: 0,
		ReservationRate:  0,
	}

	// Si no hay items, retornar stats vacías
	if len(items) == 0 {
		return stats, nil
	}

	// Calcular agregaciones
	for _, item := range items {
		stats.TotalQuantity += int64(item.Quantity)
		stats.TotalReserved += int64(item.Reserved)
		available := item.Available()
		stats.TotalAvailable += int64(available)

		// Contar items con low stock (disponible < 10)
		if available < 10 {
			stats.LowStockCount++
		}
	}

	// Calcular promedios y tasas
	if stats.TotalItems > 0 {
		stats.AverageAvailable = float64(stats.TotalAvailable) / float64(stats.TotalItems)
	}

	if stats.TotalQuantity > 0 {
		stats.ReservationRate = (float64(stats.TotalReserved) / float64(stats.TotalQuantity)) * 100
	}

	return stats, nil
}
