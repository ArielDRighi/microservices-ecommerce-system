-- Migration: Drop DLQ messages table
-- Description: Rollback migration for DLQ messages table
-- Version: 003
-- Date: 2025-10-22

DROP TABLE IF EXISTS dlq_messages;
