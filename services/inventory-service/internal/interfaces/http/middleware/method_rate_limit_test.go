package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRedisClient is a mock of RedisClient for testing
type MockRedisClient struct {
	mock.Mock
}

func (m *MockRedisClient) Increment(key string, ttl time.Duration) (int64, error) {
	args := m.Called(key, ttl)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) Get(key string) (string, error) {
	args := m.Called(key)
	return args.String(0), args.Error(1)
}

func (m *MockRedisClient) Set(key string, value string, ttl time.Duration) error {
	args := m.Called(key, value, ttl)
	return args.Error(0)
}

func (m *MockRedisClient) Delete(key string) error {
	args := m.Called(key)
	return args.Error(0)
}

func (m *MockRedisClient) Close() error {
	args := m.Called()
	return args.Error(0)
}

func TestMethodBasedRateLimiter_GetRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200, // 200 GET requests per minute
		WriteLimit: 100, // 100 POST requests per minute
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Test GET request under limit
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).Return(int64(50), nil).Once()

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "200", w.Header().Get("X-RateLimit-Limit"))
	assert.Equal(t, "150", w.Header().Get("X-RateLimit-Remaining"))
	assert.Equal(t, "GET", w.Header().Get("X-RateLimit-Method"))

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_PostRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200,
		WriteLimit: 100, // Lower limit for write operations
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Test POST request under limit
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).Return(int64(30), nil).Once()

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "100", w.Header().Get("X-RateLimit-Limit"))
	assert.Equal(t, "70", w.Header().Get("X-RateLimit-Remaining"))
	assert.Equal(t, "POST", w.Header().Get("X-RateLimit-Method"))

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_GetExceedsLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200,
		WriteLimit: 100,
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Simulate exceeding GET limit
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).Return(int64(201), nil).Once()

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "rate_limit_exceeded")
	assert.Contains(t, w.Body.String(), "GET")
	assert.NotEmpty(t, w.Header().Get("Retry-After"))

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_PostExceedsLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200,
		WriteLimit: 100,
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Simulate exceeding POST limit
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).Return(int64(101), nil).Once()

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "rate_limit_exceeded")
	assert.Contains(t, w.Body.String(), "POST")
	assert.Contains(t, w.Body.String(), "100") // Verify POST limit in message

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_SeparateCountersPerMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200,
		WriteLimit: 100,
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "GET success"})
	})
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "POST success"})
	})

	// First GET request (count: 150)
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).
		Return(int64(150), nil).Once()

	reqGet := httptest.NewRequest(http.MethodGet, "/test", nil)
	wGet := httptest.NewRecorder()
	router.ServeHTTP(wGet, reqGet)

	assert.Equal(t, http.StatusOK, wGet.Code)
	assert.Equal(t, "200", wGet.Header().Get("X-RateLimit-Limit"))

	// First POST request (count: 50) - should have separate counter
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).
		Return(int64(50), nil).Once()

	reqPost := httptest.NewRequest(http.MethodPost, "/test", nil)
	wPost := httptest.NewRecorder()
	router.ServeHTTP(wPost, reqPost)

	assert.Equal(t, http.StatusOK, wPost.Code)
	assert.Equal(t, "100", wPost.Header().Get("X-RateLimit-Limit"))

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_DifferentIPsIndependent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:      mockRedis,
		GetLimit:   200,
		WriteLimit: 100,
		Window:     time.Minute,
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// IP 1: 10.0.0.1
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).
		Return(int64(150), nil).Once()

	req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
	req1.Header.Set("X-Forwarded-For", "10.0.0.1")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	assert.Equal(t, http.StatusOK, w1.Code)

	// IP 2: 10.0.0.2 - should have independent counter
	mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).
		Return(int64(10), nil).Once()

	req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
	req2.Header.Set("X-Forwarded-For", "10.0.0.2")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_RedisFailure_FailOpen(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRedis := new(MockRedisClient)
	config := MethodBasedRateLimiterConfig{
		Redis:         mockRedis,
		GetLimit:      200,
		WriteLimit:    100,
		Window:        time.Minute,
		EnableLogging: false, // Disable logging for test
	}

	rateLimiter := NewMethodBasedRateLimiter(config)
	router := gin.New()
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Simulate Redis error
	mockRedis.On("Increment", mock.Anything, time.Minute).
		Return(int64(0), fmt.Errorf("Redis connection failed")).Once()

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should allow request despite Redis error (fail-open)
	assert.Equal(t, http.StatusOK, w.Code)

	mockRedis.AssertExpectations(t)
}

func TestMethodBasedRateLimiter_AllHTTPMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		method        string
		expectedLimit int64
	}{
		{http.MethodGet, 200},
		{http.MethodHead, 200},
		{http.MethodPost, 100},
		{http.MethodPut, 100},
		{http.MethodPatch, 100},
		{http.MethodDelete, 100},
	}

	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			mockRedis := new(MockRedisClient)
			config := MethodBasedRateLimiterConfig{
				Redis:      mockRedis,
				GetLimit:   200,
				WriteLimit: 100,
				Window:     time.Minute,
			}

			rateLimiter := NewMethodBasedRateLimiter(config)
			router := gin.New()
			router.Use(rateLimiter.Middleware())
			router.Handle(tt.method, "/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			mockRedis.On("Increment", mock.AnythingOfType("string"), time.Minute).Return(int64(10), nil).Once()

			req := httptest.NewRequest(tt.method, "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Equal(t, fmt.Sprintf("%d", tt.expectedLimit), w.Header().Get("X-RateLimit-Limit"))

			mockRedis.AssertExpectations(t)
		})
	}
}
