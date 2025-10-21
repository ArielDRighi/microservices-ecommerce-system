package handler

import (
	"context"
	"net/http"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/gin-gonic/gin"
)

// GetInventoryStatsUseCaseInterface define la interface del use case
type GetInventoryStatsUseCaseInterface interface {
	Execute(ctx context.Context) (*usecase.InventoryStats, error)
}

// GetInventoryStatsHandler maneja las peticiones para obtener estadísticas globales del inventario
type GetInventoryStatsHandler struct {
	getStatsUseCase GetInventoryStatsUseCaseInterface
}

// NewGetInventoryStatsHandler crea una nueva instancia del handler
func NewGetInventoryStatsHandler(getStatsUseCase GetInventoryStatsUseCaseInterface) *GetInventoryStatsHandler {
	return &GetInventoryStatsHandler{
		getStatsUseCase: getStatsUseCase,
	}
}

// GetInventoryStatsResponse es la respuesta del endpoint de estadísticas
type GetInventoryStatsResponse struct {
	TotalItems       int64   `json:"total_items"`
	TotalQuantity    int64   `json:"total_quantity"`
	TotalReserved    int64   `json:"total_reserved"`
	TotalAvailable   int64   `json:"total_available"`
	LowStockCount    int64   `json:"low_stock_count"`
	AverageAvailable float64 `json:"average_available"`
	ReservationRate  float64 `json:"reservation_rate"`
}

// Handle maneja la petición GET /api/inventory/stats
func (h *GetInventoryStatsHandler) Handle(c *gin.Context) {
	stats, err := h.getStatsUseCase.Execute(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve inventory statistics",
			"details": err.Error(),
		})
		return
	}

	response := GetInventoryStatsResponse{
		TotalItems:       stats.TotalItems,
		TotalQuantity:    stats.TotalQuantity,
		TotalReserved:    stats.TotalReserved,
		TotalAvailable:   stats.TotalAvailable,
		LowStockCount:    stats.LowStockCount,
		AverageAvailable: stats.AverageAvailable,
		ReservationRate:  stats.ReservationRate,
	}

	c.JSON(http.StatusOK, response)
}
