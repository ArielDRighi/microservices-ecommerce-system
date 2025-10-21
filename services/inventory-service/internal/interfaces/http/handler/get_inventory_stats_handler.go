package handler

import (
	"context"
	"net/http"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/gin-gonic/gin"
)

// GetInventoryStatsUseCaseInterface defines the interface of the use case
type GetInventoryStatsUseCaseInterface interface {
	Execute(ctx context.Context) (*usecase.InventoryStats, error)
}

// GetInventoryStatsHandler handles requests to obtain global inventory statistics
type GetInventoryStatsHandler struct {
	getStatsUseCase GetInventoryStatsUseCaseInterface
}

// NewGetInventoryStatsHandler creates a new instance of the handler
func NewGetInventoryStatsHandler(getStatsUseCase GetInventoryStatsUseCaseInterface) *GetInventoryStatsHandler {
	return &GetInventoryStatsHandler{
		getStatsUseCase: getStatsUseCase,
	}
}

// GetInventoryStatsResponse is the response of the statistics endpoint
type GetInventoryStatsResponse struct {
	TotalItems       int64   `json:"total_items"`
	TotalQuantity    int64   `json:"total_quantity"`
	TotalReserved    int64   `json:"total_reserved"`
	TotalAvailable   int64   `json:"total_available"`
	LowStockCount    int64   `json:"low_stock_count"`
	AverageAvailable float64 `json:"average_available"`
	ReservationRate  float64 `json:"reservation_rate"`
}

// Handle handles the GET /api/inventory/stats request
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
