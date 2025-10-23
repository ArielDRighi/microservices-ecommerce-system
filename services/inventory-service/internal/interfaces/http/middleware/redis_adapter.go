package middleware

import (
	"context"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/cache"
)

// RedisClientAdapter adapts cache.RedisClient to the middleware.RedisClient interface
type RedisClientAdapter struct {
	client *cache.RedisClient
}

// NewRedisClientAdapter creates a new adapter
func NewRedisClientAdapter(client *cache.RedisClient) *RedisClientAdapter {
	return &RedisClientAdapter{
		client: client,
	}
}

// Increment increments a counter with TTL
func (a *RedisClientAdapter) Increment(key string, ttl time.Duration) (int64, error) {
	ctx := context.Background()
	return a.client.Increment(ctx, key, ttl)
}

// Delete removes a key
func (a *RedisClientAdapter) Delete(key string) error {
	ctx := context.Background()
	return a.client.Delete(ctx, key)
}

// Get retrieves a value by key
func (a *RedisClientAdapter) Get(key string) (string, error) {
	ctx := context.Background()
	return a.client.Get(ctx, key)
}

// Set stores a value with TTL
func (a *RedisClientAdapter) Set(key string, value string, ttl time.Duration) error {
	ctx := context.Background()
	return a.client.SetWithTTL(ctx, key, value, ttl)
}

// Close closes the Redis connection
func (a *RedisClientAdapter) Close() error {
	return a.client.Close()
}
