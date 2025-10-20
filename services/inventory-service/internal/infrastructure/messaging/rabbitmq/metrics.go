package rabbitmq

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds all Prometheus metrics for the RabbitMQ publisher
type Metrics struct {
	EventsPublishedTotal *prometheus.CounterVec
	PublishDuration      *prometheus.HistogramVec
	PublishErrorsTotal   *prometheus.CounterVec
	PublishRetriesTotal  *prometheus.CounterVec
}

// NewMetrics creates and registers Prometheus metrics for the RabbitMQ publisher
func NewMetrics() *Metrics {
	return &Metrics{
		EventsPublishedTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "inventory",
				Subsystem: "events",
				Name:      "published_total",
				Help:      "Total number of events published to RabbitMQ",
			},
			[]string{"event_type", "routing_key", "status"},
		),
		PublishDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "inventory",
				Subsystem: "events",
				Name:      "publish_duration_seconds",
				Help:      "Duration of event publish operations in seconds",
				Buckets:   prometheus.DefBuckets, // [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
			},
			[]string{"event_type", "routing_key"},
		),
		PublishErrorsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "inventory",
				Subsystem: "events",
				Name:      "publish_errors_total",
				Help:      "Total number of errors when publishing events to RabbitMQ",
			},
			[]string{"event_type", "routing_key", "error_type"},
		),
		PublishRetriesTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "inventory",
				Subsystem: "events",
				Name:      "publish_retries_total",
				Help:      "Total number of publish retry attempts",
			},
			[]string{"event_type", "routing_key", "attempt"},
		),
	}
}
