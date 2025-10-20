package handler

import (
	goerrors "errors"
	"net/http"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CheckAvailabilityExecutor defines the interface for executing stock availability checks
type CheckAvailabilityExecutor interface {
	Execute(ctx interface{}, input usecase.CheckAvailabilityInput) (*usecase.CheckAvailabilityOutput, error)
}

// ReserveStockExecutor defines the interface for executing stock reservations
type ReserveStockExecutor interface {
	Execute(ctx interface{}, input usecase.ReserveStockInput) (*usecase.ReserveStockOutput, error)
}

// ConfirmReservationExecutor defines the interface for confirming reservations
type ConfirmReservationExecutor interface {
	Execute(ctx interface{}, input usecase.ConfirmReservationInput) (*usecase.ConfirmReservationOutput, error)
}

// ReleaseReservationExecutor defines the interface for releasing reservations
type ReleaseReservationExecutor interface {
	Execute(ctx interface{}, input usecase.ReleaseReservationInput) (*usecase.ReleaseReservationOutput, error)
}

// InventoryHandler handles HTTP requests for inventory operations
type InventoryHandler struct {
	checkAvailability  CheckAvailabilityExecutor
	reserveStock       ReserveStockExecutor
	confirmReservation ConfirmReservationExecutor
	releaseReservation ReleaseReservationExecutor
}

// NewInventoryHandler creates a new InventoryHandler
func NewInventoryHandler(
	checkAvailability CheckAvailabilityExecutor,
	reserveStock ReserveStockExecutor,
	confirmReservation ConfirmReservationExecutor,
	releaseReservation ReleaseReservationExecutor,
) *InventoryHandler {
	return &InventoryHandler{
		checkAvailability:  checkAvailability,
		reserveStock:       reserveStock,
		confirmReservation: confirmReservation,
		releaseReservation: releaseReservation,
	}
}

// GetByProductID handles GET /api/inventory/:productId
// It returns the stock availability for a specific product
func (h *InventoryHandler) GetByProductID(c *gin.Context) {
	// Parse product ID from URL parameter
	productIDStr := c.Param("productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_product_id",
			"message": "Invalid product ID format. Expected UUID.",
		})
		return
	}

	// Execute use case with quantity=1 for basic availability check
	input := usecase.CheckAvailabilityInput{
		ProductID: productID,
		Quantity:  1,
	}

	output, err := h.checkAvailability.Execute(c.Request.Context(), input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"product_id":         output.ProductID.String(),
		"is_available":       output.IsAvailable,
		"available_quantity": output.AvailableQuantity,
		"total_stock":        output.TotalStock,
		"reserved_quantity":  output.ReservedQuantity,
	})
}

// ReserveStockRequest represents the request body for reserving stock
type ReserveStockRequest struct {
	ProductID string `json:"product_id" binding:"required"`
	OrderID   string `json:"order_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// ReserveStock handles POST /api/inventory/reserve
// It creates a temporary stock reservation for an order
func (h *InventoryHandler) ReserveStock(c *gin.Context) {
	var req ReserveStockRequest

	// Parse and validate JSON body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body: " + err.Error(),
		})
		return
	}

	// Parse product_id
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_product_id",
			"message": "Invalid product ID format. Expected UUID.",
		})
		return
	}

	// Parse order_id
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_order_id",
			"message": "Invalid order ID format. Expected UUID.",
		})
		return
	}

	// Execute use case
	input := usecase.ReserveStockInput{
		ProductID: productID,
		OrderID:   orderID,
		Quantity:  req.Quantity,
		Duration:  nil, // Use default 15 minutes
	}

	output, err := h.reserveStock.Execute(c.Request.Context(), input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// Return success response with 201 Created
	c.JSON(http.StatusCreated, gin.H{
		"reservation_id":  output.ReservationID.String(),
		"product_id":      output.ProductID.String(),
		"order_id":        output.OrderID.String(),
		"quantity":        output.Quantity,
		"expires_at":      output.ExpiresAt.Format(time.RFC3339),
		"remaining_stock": output.RemainingStock,
	})
}

// handleError maps domain errors to appropriate HTTP responses
func (h *InventoryHandler) handleError(c *gin.Context, err error) {
	var statusCode int
	var errorCode string
	var message string

	switch {
	case goerrors.Is(err, errors.ErrInventoryItemNotFound):
		statusCode = http.StatusNotFound
		errorCode = "product_not_found"
		message = "Product not found in inventory"
	case goerrors.Is(err, errors.ErrInvalidQuantity):
		statusCode = http.StatusBadRequest
		errorCode = "invalid_quantity"
		message = "Invalid quantity specified"
	case goerrors.Is(err, errors.ErrInsufficientStock):
		statusCode = http.StatusConflict
		errorCode = "insufficient_stock"
		message = "Insufficient stock available"
	default:
		statusCode = http.StatusInternalServerError
		errorCode = "internal_error"
		message = "Internal server error"
	}

	c.JSON(statusCode, gin.H{
		"error":   errorCode,
		"message": message,
	})
}
