package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
)

// ReleaseExpiredReservationsExecutor interface for the use case
type ReleaseExpiredReservationsExecutor interface {
	Execute(ctx context.Context) (*usecase.ReleaseExpiredReservationsOutput, error)
}

// ReservationScheduler handles periodic tasks for reservation maintenance
type ReservationScheduler struct {
	releaseExpiredUseCase ReleaseExpiredReservationsExecutor
	interval              time.Duration
	stopChan              chan bool
}

// NewReservationScheduler creates a new scheduler instance
func NewReservationScheduler(
	releaseExpiredUseCase ReleaseExpiredReservationsExecutor,
	interval time.Duration,
) *ReservationScheduler {
	return &ReservationScheduler{
		releaseExpiredUseCase: releaseExpiredUseCase,
		interval:              interval,
		stopChan:              make(chan bool),
	}
}

// Start begins the scheduler loop in a goroutine
func (s *ReservationScheduler) Start() {
	log.Printf("[ReservationScheduler] Starting with interval: %s", s.interval)

	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				s.runReleaseExpired()
			case <-s.stopChan:
				log.Println("[ReservationScheduler] Stopped")
				return
			}
		}
	}()
}

// Stop gracefully stops the scheduler
func (s *ReservationScheduler) Stop() {
	log.Println("[ReservationScheduler] Stopping...")
	s.stopChan <- true
	close(s.stopChan)
}

// runReleaseExpired executes the release expired reservations use case
func (s *ReservationScheduler) runReleaseExpired() {
	log.Println("[ReservationScheduler] Running release expired reservations task")

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	output, err := s.releaseExpiredUseCase.Execute(ctx)
	if err != nil {
		log.Printf("[ReservationScheduler] ERROR: Failed to release expired reservations: %v", err)
		return
	}

	log.Printf("[ReservationScheduler] Task completed - Found: %d, Released: %d, Failed: %d, Duration: %dms",
		output.TotalFound, output.TotalReleased, output.TotalFailed, output.ExecutionDurationMillis)

	// Log details if there were failures
	if output.TotalFailed > 0 {
		log.Printf("[ReservationScheduler] WARNING: %d reservations failed to release", output.TotalFailed)
		for _, failed := range output.FailedReservations {
			log.Printf("[ReservationScheduler] Failed reservation %s: %s", failed.ReservationID, failed.Reason)
		}
	}
}
