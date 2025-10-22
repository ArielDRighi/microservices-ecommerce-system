package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

import "context"

// MockReleaseExpiredReservationsUseCase is a mock for testing
type MockReleaseExpiredReservationsUseCase struct {
	mock.Mock
}

func (m *MockReleaseExpiredReservationsUseCase) Execute(ctx context.Context) (*usecase.ReleaseExpiredReservationsOutput, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.ReleaseExpiredReservationsOutput), args.Error(1)
}

// Test: Constructor
func TestNewReservationMaintenanceHandler(t *testing.T) {
	mockUseCase := new(MockReleaseExpiredReservationsUseCase)

	handler := NewReservationMaintenanceHandler(mockUseCase)

	assert.NotNil(t, handler)
	assert.Equal(t, mockUseCase, handler.releaseExpiredUseCase)
}

// Test: ReleaseExpired - Success with no reservations
func TestReservationMaintenanceHandler_ReleaseExpired_NoReservations(t *testing.T) {
	mockUseCase := new(MockReleaseExpiredReservationsUseCase)
	handler := NewReservationMaintenanceHandler(mockUseCase)

	// Setup mock response
	output := &usecase.ReleaseExpiredReservationsOutput{
		TotalFound:              0,
		TotalReleased:           0,
		TotalFailed:             0,
		ReleasedReservationIDs:  []uuid.UUID{},
		FailedReservations:      []usecase.FailedReservation{},
		ExecutionDurationMillis: 5,
	}

	mockUseCase.On("Execute", mock.Anything).Return(output, nil)

	// Setup gin context
	gin.SetMode(gin.TestMode)
	w := performRequest(handler, "POST", "/admin/reservations/release-expired", nil)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"totalFound":0`)
	assert.Contains(t, w.Body.String(), `"totalReleased":0`)
	assert.Contains(t, w.Body.String(), `"totalFailed":0`)

	mockUseCase.AssertExpectations(t)
}

// Test: ReleaseExpired - Success with reservations released
func TestReservationMaintenanceHandler_ReleaseExpired_Success(t *testing.T) {
	mockUseCase := new(MockReleaseExpiredReservationsUseCase)
	handler := NewReservationMaintenanceHandler(mockUseCase)

	// Setup mock response
	id1 := uuid.New()
	id2 := uuid.New()
	output := &usecase.ReleaseExpiredReservationsOutput{
		TotalFound:             3,
		TotalReleased:          2,
		TotalFailed:            1,
		ReleasedReservationIDs: []uuid.UUID{id1, id2},
		FailedReservations: []usecase.FailedReservation{
			{
				ReservationID: uuid.New(),
				Reason:        "inventory not found",
			},
		},
		ExecutionDurationMillis: 150,
	}

	mockUseCase.On("Execute", mock.Anything).Return(output, nil)

	// Setup gin context
	gin.SetMode(gin.TestMode)
	w := performRequest(handler, "POST", "/admin/reservations/release-expired", nil)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"totalFound":3`)
	assert.Contains(t, w.Body.String(), `"totalReleased":2`)
	assert.Contains(t, w.Body.String(), `"totalFailed":1`)
	assert.Contains(t, w.Body.String(), id1.String())
	assert.Contains(t, w.Body.String(), id2.String())
	assert.Contains(t, w.Body.String(), "inventory not found")

	mockUseCase.AssertExpectations(t)
}

// Test: ReleaseExpired - UseCase returns error
func TestReservationMaintenanceHandler_ReleaseExpired_UseCaseError(t *testing.T) {
	mockUseCase := new(MockReleaseExpiredReservationsUseCase)
	handler := NewReservationMaintenanceHandler(mockUseCase)

	// Setup mock error
	mockUseCase.On("Execute", mock.Anything).Return(nil, assert.AnError)

	// Setup gin context
	gin.SetMode(gin.TestMode)
	w := performRequest(handler, "POST", "/admin/reservations/release-expired", nil)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to release expired reservations")
	assert.Contains(t, w.Body.String(), "assert.AnError")

	mockUseCase.AssertExpectations(t)
}

// performRequest is a helper function to perform HTTP requests for testing
func performRequest(handler *ReservationMaintenanceHandler, method, path string, body io.Reader) *httptest.ResponseRecorder {
	router := gin.New()
	router.POST("/admin/reservations/release-expired", handler.ReleaseExpired)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, body)
	router.ServeHTTP(w, req)

	return w
}
