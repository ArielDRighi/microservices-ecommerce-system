import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests pass through
  OPEN = 'OPEN', // Too many failures, requests are rejected
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time in milliseconds to wait before attempting recovery */
  recoveryTimeout: number;

  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;

  /** Timeout for each request in milliseconds */
  timeout: number;

  /** Name of the circuit breaker for logging */
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTimeouts: number;
  totalRejected: number;
}

/**
 * Circuit Breaker Pattern Implementation
 * Protects external service calls from cascading failures
 */
export class CircuitBreaker {
  private readonly logger = new Logger(`CircuitBreaker:${this.config.name}`);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;

  // Statistics
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalTimeouts = 0;
  private totalRejected = 0;

  constructor(private readonly config: CircuitBreakerConfig) {
    this.logger.log(
      `Circuit breaker initialized: failureThreshold=${config.failureThreshold}, ` +
        `recoveryTimeout=${config.recoveryTimeout}ms, successThreshold=${config.successThreshold}`,
    );
  }

  /**
   * Execute a function protected by circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.logger.log('Circuit is OPEN but attempting reset to HALF_OPEN');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        this.totalRejected++;
        const waitTime = this.nextAttemptTime
          ? Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000)
          : 0;

        this.logger.warn(
          `Circuit is OPEN. Rejecting call. Next attempt in ${waitTime}s. ` +
            `Failures: ${this.failureCount}/${this.config.failureThreshold}`,
        );

        throw new Error(
          `Circuit breaker is OPEN for ${this.config.name}. Service temporarily unavailable. Retry in ${waitTime}s.`,
        );
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          this.totalTimeouts++;
          reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
        }, this.config.timeout),
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.logger.debug(
        `Success in HALF_OPEN state. ` +
          `Successes: ${this.successCount}/${this.config.successThreshold}`,
      );

      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      if (this.failureCount > 0) {
        this.logger.debug(`Resetting failure count from ${this.failureCount} to 0`);
        this.failureCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = new Date();

    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.warn(
      `Failure detected. Count: ${this.failureCount}/${this.config.failureThreshold}. Error: ${errorMessage}`,
    );

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Failure in HALF_OPEN state. Opening circuit again.');
      this.open();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);

    this.logger.error(
      `Circuit breaker OPENED after ${this.failureCount} failures. ` +
        `Will attempt reset at ${this.nextAttemptTime.toISOString()}`,
    );
  }

  /**
   * Reset circuit to closed state
   */
  private reset(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = undefined;

    this.logger.log(
      `Circuit breaker CLOSED (recovered from ${previousState}). System back to normal operation.`,
    );
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return true;
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Manually open the circuit
   */
  forceOpen(): void {
    this.logger.warn('Circuit breaker MANUALLY OPENED');
    this.open();
  }

  /**
   * Manually close the circuit
   */
  forceClose(): void {
    this.logger.log('Circuit breaker MANUALLY CLOSED');
    this.reset();
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalTimeouts: this.totalTimeouts,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}
