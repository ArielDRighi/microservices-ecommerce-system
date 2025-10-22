package handler

import (
	"context"
	"net/http"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/gin-gonic/gin"
)

// ReservationMaintenanceHandler handles administrative operations for reservations
type ReservationMaintenanceHandler struct {
	releaseExpiredUseCase ReleaseExpiredReservationsUseCase
}

// ReleaseExpiredReservationsUseCase interface for dependency injection
type ReleaseExpiredReservationsUseCase interface {
	Execute(ctx context.Context) (*usecase.ReleaseExpiredReservationsOutput, error)
}

// NewReservationMaintenanceHandler creates a new instance
func NewReservationMaintenanceHandler(releaseExpiredUseCase ReleaseExpiredReservationsUseCase) *ReservationMaintenanceHandler {
	return &ReservationMaintenanceHandler{
		releaseExpiredUseCase: releaseExpiredUseCase,
	}
}

// ReleaseExpiredResponse represents the response structure
type ReleaseExpiredResponse struct {
	TotalFound              int                         `json:"totalFound"`
	TotalReleased           int                         `json:"totalReleased"`
	TotalFailed             int                         `json:"totalFailed"`
	ReleasedReservationIDs  []string                    `json:"releasedReservationIds"`
	FailedReservations      []FailedReservationResponse `json:"failedReservations"`
	ExecutionDurationMillis int64                       `json:"executionDurationMillis"`
}

// FailedReservationResponse represents a failed reservation
type FailedReservationResponse struct {
	ReservationID string `json:"reservationId"`
	Reason        string `json:"reason"`
}

// ReleaseExpired handles POST /admin/reservations/release-expired
// @Summary Release all expired reservations
// @Description Finds and releases all expired reservations (status=pending, expiresAt < now)
// @Tags Admin, Reservations
// @Produce json
// @Success 200 {object} ReleaseExpiredResponse
// @Failure 500 {object} ErrorResponse
// @Router /admin/reservations/release-expired [post]
func (h *ReservationMaintenanceHandler) ReleaseExpired(c *gin.Context) {
	// Execute use case
	output, err := h.releaseExpiredUseCase.Execute(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to release expired reservations",
			"message": err.Error(),
		})
		return
	}

	// Convert UUIDs to strings for JSON response
	releasedIDs := make([]string, len(output.ReleasedReservationIDs))
	for i, id := range output.ReleasedReservationIDs {
		releasedIDs[i] = id.String()
	}

	// Convert failed reservations
	failedReservations := make([]FailedReservationResponse, len(output.FailedReservations))
	for i, failed := range output.FailedReservations {
		failedReservations[i] = FailedReservationResponse{
			ReservationID: failed.ReservationID.String(),
			Reason:        failed.Reason,
		}
	}

	// Return response
	c.JSON(http.StatusOK, ReleaseExpiredResponse{
		TotalFound:              output.TotalFound,
		TotalReleased:           output.TotalReleased,
		TotalFailed:             output.TotalFailed,
		ReleasedReservationIDs:  releasedIDs,
		FailedReservations:      failedReservations,
		ExecutionDurationMillis: output.ExecutionDurationMillis,
	})
}
