-- Migration: Create DLQ (Dead Letter Queue) messages table
-- Description: Table to store failed messages for retry and monitoring
-- Version: 003
-- Date: 2025-10-22

CREATE TABLE IF NOT EXISTS dlq_messages (
    id UUID PRIMARY KEY,
    message_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    original_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_retry_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_dlq_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT chk_dlq_max_retries_positive CHECK (max_retries > 0),
    CONSTRAINT chk_dlq_status CHECK (status IN ('pending', 'retrying', 'failed', 'resolved'))
);

-- Index on message_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_dlq_message_type ON dlq_messages(message_type);

-- Index on status for filtering by status
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dlq_messages(status);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dlq_messages(created_at DESC);

-- Composite index for finding pending messages by type
CREATE INDEX IF NOT EXISTS idx_dlq_pending_messages ON dlq_messages(status, message_type, created_at);

-- Index on retry_count for monitoring retry patterns
CREATE INDEX IF NOT EXISTS idx_dlq_retry_count ON dlq_messages(retry_count);

-- Comment on table
COMMENT ON TABLE dlq_messages IS 'Dead Letter Queue for failed messages requiring manual intervention or retry';

-- Comments on columns
COMMENT ON COLUMN dlq_messages.id IS 'Primary key UUID';
COMMENT ON COLUMN dlq_messages.message_type IS 'Type of message (e.g., OrderCreated, InventoryReserved)';
COMMENT ON COLUMN dlq_messages.payload IS 'Original message payload in JSON format';
COMMENT ON COLUMN dlq_messages.error_message IS 'Error description from failed processing';
COMMENT ON COLUMN dlq_messages.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN dlq_messages.max_retries IS 'Maximum number of retries allowed';
COMMENT ON COLUMN dlq_messages.status IS 'Message status: pending, retrying, failed, resolved';
COMMENT ON COLUMN dlq_messages.original_timestamp IS 'Original timestamp from the message';
COMMENT ON COLUMN dlq_messages.created_at IS 'Timestamp when DLQ record was created';
COMMENT ON COLUMN dlq_messages.updated_at IS 'Timestamp when record was last updated';
COMMENT ON COLUMN dlq_messages.last_retry_at IS 'Timestamp of last retry attempt';
