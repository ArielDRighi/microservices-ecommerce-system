package cache

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// setupRedisTestContainer creates a Redis testcontainer and returns config
func setupRedisTestContainer(t *testing.T) (*RedisConfig, func()) {
	ctx := context.Background()

	// Create Redis container
	req := testcontainers.ContainerRequest{
		Image:        "redis:7-alpine",
		ExposedPorts: []string{"6379/tcp"},
		WaitingFor:   wait.ForLog("Ready to accept connections"),
	}

	redisContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err)

	// Get container host and port
	host, err := redisContainer.Host(ctx)
	require.NoError(t, err)

	port, err := redisContainer.MappedPort(ctx, "6379")
	require.NoError(t, err)

	config := &RedisConfig{
		Host:     host,
		Port:     port.Int(),
		Password: "",
		DB:       0,
	}

	// Cleanup function
	cleanup := func() {
		redisContainer.Terminate(ctx)
	}

	return config, cleanup
}

func TestNewRedisClient(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	// Test: Successful connection
	client, err := NewRedisClient(config, 5*time.Minute)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	defer client.Close()

	// Test: Nil config
	nilClient, err := NewRedisClient(nil, 5*time.Minute)
	assert.Error(t, err)
	assert.Nil(t, nilClient)
	assert.Contains(t, err.Error(), "config cannot be nil")

	// Test: Invalid connection
	badConfig := &RedisConfig{
		Host:     "invalid-host",
		Port:     9999,
		Password: "",
		DB:       0,
	}
	badClient, err := NewRedisClient(badConfig, 5*time.Minute)
	assert.Error(t, err)
	assert.Nil(t, badClient)
	assert.Contains(t, err.Error(), "failed to connect to Redis")
}

func TestRedisClient_SetAndGet(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Test: Set and Get
	err = client.Set(ctx, "test-key", "test-value")
	assert.NoError(t, err)

	val, err := client.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.Equal(t, "test-value", val)

	// Test: Get non-existing key
	val, err = client.Get(ctx, "non-existing-key")
	assert.NoError(t, err)
	assert.Equal(t, "", val)
}

func TestRedisClient_SetWithTTL(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Test: Set with custom TTL
	err = client.SetWithTTL(ctx, "ttl-key", "ttl-value", 1*time.Second)
	assert.NoError(t, err)

	// Verify value exists
	val, err := client.Get(ctx, "ttl-key")
	assert.NoError(t, err)
	assert.Equal(t, "ttl-value", val)

	// Wait for expiration
	time.Sleep(2 * time.Second)

	// Verify value expired
	val, err = client.Get(ctx, "ttl-key")
	assert.NoError(t, err)
	assert.Equal(t, "", val)
}

func TestRedisClient_Delete(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Set multiple keys
	err = client.Set(ctx, "key1", "value1")
	require.NoError(t, err)
	err = client.Set(ctx, "key2", "value2")
	require.NoError(t, err)

	// Test: Delete single key
	err = client.Delete(ctx, "key1")
	assert.NoError(t, err)

	val, err := client.Get(ctx, "key1")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	// Test: Delete multiple keys
	err = client.Set(ctx, "key3", "value3")
	require.NoError(t, err)

	err = client.Delete(ctx, "key2", "key3")
	assert.NoError(t, err)

	val, err = client.Get(ctx, "key2")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	val, err = client.Get(ctx, "key3")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	// Test: Delete with no keys
	err = client.Delete(ctx)
	assert.NoError(t, err)
}

func TestRedisClient_DeletePattern(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Set keys with pattern
	err = client.Set(ctx, "inventory:product:1", "value1")
	require.NoError(t, err)
	err = client.Set(ctx, "inventory:product:2", "value2")
	require.NoError(t, err)
	err = client.Set(ctx, "inventory:product:3", "value3")
	require.NoError(t, err)
	err = client.Set(ctx, "other:key", "other-value")
	require.NoError(t, err)

	// Test: Delete by pattern
	err = client.DeletePattern(ctx, "inventory:product:*")
	assert.NoError(t, err)

	// Verify inventory keys are deleted
	val, err := client.Get(ctx, "inventory:product:1")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	val, err = client.Get(ctx, "inventory:product:2")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	// Verify other key still exists
	val, err = client.Get(ctx, "other:key")
	assert.NoError(t, err)
	assert.Equal(t, "other-value", val)
}

func TestRedisClient_Exists(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Set a key
	err = client.Set(ctx, "exists-key", "exists-value")
	require.NoError(t, err)

	// Test: Key exists
	exists, err := client.Exists(ctx, "exists-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	// Test: Key doesn't exist
	exists, err = client.Exists(ctx, "non-existing-key")
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestRedisClient_Expire(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Set a key without expiration
	err = client.Set(ctx, "expire-key", "expire-value")
	require.NoError(t, err)

	// Test: Set expiration
	err = client.Expire(ctx, "expire-key", 1*time.Second)
	assert.NoError(t, err)

	// Verify key exists
	val, err := client.Get(ctx, "expire-key")
	assert.NoError(t, err)
	assert.Equal(t, "expire-value", val)

	// Wait for expiration
	time.Sleep(2 * time.Second)

	// Verify key expired
	val, err = client.Get(ctx, "expire-key")
	assert.NoError(t, err)
	assert.Equal(t, "", val)
}

func TestRedisClient_Ping(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Test: Ping
	err = client.Ping(ctx)
	assert.NoError(t, err)
}

func TestRedisClient_FlushDB(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)
	defer client.Close()

	ctx := context.Background()

	// Set multiple keys
	err = client.Set(ctx, "key1", "value1")
	require.NoError(t, err)
	err = client.Set(ctx, "key2", "value2")
	require.NoError(t, err)

	// Test: FlushDB
	err = client.FlushDB(ctx)
	assert.NoError(t, err)

	// Verify all keys are deleted
	val, err := client.Get(ctx, "key1")
	assert.NoError(t, err)
	assert.Equal(t, "", val)

	val, err = client.Get(ctx, "key2")
	assert.NoError(t, err)
	assert.Equal(t, "", val)
}

func TestRedisClient_Close(t *testing.T) {
	config, cleanup := setupRedisTestContainer(t)
	defer cleanup()

	client, err := NewRedisClient(config, 5*time.Minute)
	require.NoError(t, err)

	// Test: Close
	err = client.Close()
	assert.NoError(t, err)
}
