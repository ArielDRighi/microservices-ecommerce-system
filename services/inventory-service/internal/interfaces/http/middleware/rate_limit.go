package middleware

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// RedisClient defines the interface for Redis operations needed by RateLimiter
type RedisClient interface {
	Increment(key string, ttl time.Duration) (int64, error)
	Get(key string) (string, error)
	Set(key string, value string, ttl time.Duration) error
	Delete(key string) error
	Close() error
}

// RateLimiter implements rate limiting middleware using Redis
type RateLimiter struct {
	redis     RedisClient
	limit     int64
	window    time.Duration
	keyPrefix string
}

// NewRateLimiter creates a new RateLimiter instance
// limit: maximum number of requests per window
// window: time window duration (e.g., 1 minute)
func NewRateLimiter(redis RedisClient, limit int64, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:     redis,
		limit:     limit,
		window:    window,
		keyPrefix: "rate_limit:",
	}
}

// Middleware returns a Gin middleware function for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract client IP
		clientIP := rl.getClientIP(c)
		key := rl.keyPrefix + clientIP

		// Increment request count for this IP
		count, err := rl.redis.Increment(key, rl.window)
		if err != nil {
			// Fail-open: if Redis is unavailable, allow the request
			// Log error in production
			c.Next()
			return
		}

		// Calculate remaining requests
		remaining := rl.limit - count
		if remaining < 0 {
			remaining = 0
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(rl.window).Unix()))

		// Check if limit exceeded
		if count > rl.limit {
			c.Header("Retry-After", fmt.Sprintf("%d", int(rl.window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": fmt.Sprintf("Rate limit of %d requests per %s exceeded", rl.limit, rl.window),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// getClientIP extracts the real client IP address
// Checks X-Forwarded-For header first (for proxies/load balancers)
// Falls back to RemoteAddr
func (rl *RateLimiter) getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (standard for proxies)
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// Get the first IP in the list (original client)
		ips := strings.Split(forwarded, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header (alternative)
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	// RemoteAddr includes port, so we need to extract just the IP
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		// If split fails, return the whole RemoteAddr
		return c.Request.RemoteAddr
	}

	return ip
}
