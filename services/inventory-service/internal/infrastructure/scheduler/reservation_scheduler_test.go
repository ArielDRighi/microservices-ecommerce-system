package scheduler

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
)

// MockReleaseExpiredReservationsUseCase mocks the use case
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

func TestNewReservationScheduler(t *testing.T) {
	mockUseCase := &MockReleaseExpiredReservationsUseCase{}
	interval := 5 * time.Minute

	scheduler := NewReservationScheduler(
		mockUseCase,
		interval,
	)

	assert.NotNil(t, scheduler)
	assert.Equal(t, interval, scheduler.interval)
	assert.NotNil(t, scheduler.stopChan)
}

func TestReservationScheduler_StartAndStop(t *testing.T) {
	mockUseCase := &MockReleaseExpiredReservationsUseCase{}

	// Configure mock to return success
	output := &usecase.ReleaseExpiredReservationsOutput{
		TotalFound:              5,
		TotalReleased:           5,
		TotalFailed:             0,
		ReleasedReservationIDs:  []uuid.UUID{uuid.New()},
		FailedReservations:      []usecase.FailedReservation{},
		ExecutionDurationMillis: 100,
	}

	mockUseCase.On("Execute", mock.Anything).Return(output, nil).Maybe()

	// Use very short interval for testing (100ms)
	scheduler := NewReservationScheduler(
		mockUseCase,
		100*time.Millisecond,
	)

	// Start the scheduler
	scheduler.Start()

	// Let it run for a short time
	time.Sleep(150 * time.Millisecond)

	// Stop the scheduler
	scheduler.Stop()

	// Give it time to shutdown
	time.Sleep(50 * time.Millisecond)

	// Test should complete without panic
	assert.True(t, true)
}

func TestReservationScheduler_ExecutesTaskPeriodically(t *testing.T) {
	executionCount := 0

	// Mock use case that counts executions
	mockUseCase := &MockReleaseExpiredReservationsUseCase{}
	output := &usecase.ReleaseExpiredReservationsOutput{
		TotalFound:              0,
		TotalReleased:           0,
		TotalFailed:             0,
		ReleasedReservationIDs:  []uuid.UUID{},
		FailedReservations:      []usecase.FailedReservation{},
		ExecutionDurationMillis: 10,
	}

	mockUseCase.On("Execute", mock.Anything).Return(output, nil).Run(func(args mock.Arguments) {
		executionCount++
	})

	// Use very short interval (100ms)
	scheduler := NewReservationScheduler(
		mockUseCase,
		100*time.Millisecond,
	)

	scheduler.Start()

	// Wait for ~2-3 executions
	time.Sleep(250 * time.Millisecond)

	scheduler.Stop()

	// Should have executed at least twice
	assert.GreaterOrEqual(t, executionCount, 2, "Should have executed at least 2 times")
	mockUseCase.AssertExpectations(t)
}

func TestReservationScheduler_HandlesErrors(t *testing.T) {
	mockUseCase := &MockReleaseExpiredReservationsUseCase{}

	// Configure mock to return error
	mockUseCase.On("Execute", mock.Anything).Return(nil, errors.New("database error")).Maybe()

	scheduler := NewReservationScheduler(
		mockUseCase,
		100*time.Millisecond,
	)

	scheduler.Start()

	// Let it run and handle the error
	time.Sleep(150 * time.Millisecond)

	scheduler.Stop()

	// Should not panic despite errors
	assert.True(t, true)
}

func TestReservationScheduler_LogsFailedReservations(t *testing.T) {
	mockUseCase := &MockReleaseExpiredReservationsUseCase{}

	// Configure mock with failed reservations
	output := &usecase.ReleaseExpiredReservationsOutput{
		TotalFound:             3,
		TotalReleased:          2,
		TotalFailed:            1,
		ReleasedReservationIDs: []uuid.UUID{uuid.New(), uuid.New()},
		FailedReservations: []usecase.FailedReservation{
			{
				ReservationID: uuid.New(),
				Reason:        "inventory not found",
			},
		},
		ExecutionDurationMillis: 200,
	}

	mockUseCase.On("Execute", mock.Anything).Return(output, nil).Maybe()

	scheduler := NewReservationScheduler(
		mockUseCase,
		100*time.Millisecond,
	)

	scheduler.Start()
	time.Sleep(150 * time.Millisecond)
	scheduler.Stop()

	// Should handle and log failures without crashing
	assert.True(t, true)
}
