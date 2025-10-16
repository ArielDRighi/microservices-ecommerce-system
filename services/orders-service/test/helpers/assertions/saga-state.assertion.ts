import {
  SagaStateEntity,
  SagaStatus,
  SagaType,
} from '../../../src/database/entities/saga-state.entity';

/**
 * Helper para assertions relacionadas con estados de Saga
 */
export class SagaStateAssertion {
  /**
   * Valida que una saga esté en estado STARTED
   */
  static expectStarted(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.STARTED);
    expect(saga.completedAt).toBeNull();
    expect(saga.failedAt).toBeNull();
  }

  /**
   * Valida que una saga esté en estado RUNNING
   */
  static expectRunning(saga: SagaStateEntity, expectedStep?: string): void {
    expect(saga.status).toBe(SagaStatus.RUNNING);
    if (expectedStep !== undefined) {
      expect(saga.currentStep).toBe(expectedStep);
    }
    expect(saga.completedAt).toBeNull();
    expect(saga.failedAt).toBeNull();
  }

  /**
   * Valida que una saga esté completada exitosamente
   */
  static expectCompleted(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.COMPLETED);
    expect(saga.completedAt).not.toBeNull();
    expect(saga.failedAt).toBeNull();
  }

  /**
   * Valida que una saga haya fallado
   */
  static expectFailed(saga: SagaStateEntity, expectedError?: string): void {
    expect(saga.status).toBe(SagaStatus.FAILED);
    expect(saga.failedAt).not.toBeNull();
    expect(saga.errorDetails).not.toBeNull();

    if (expectedError) {
      expect(saga.errorDetails).toContain(expectedError);
    }
  }

  /**
   * Valida que una saga esté en proceso de compensación
   */
  static expectCompensating(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.COMPENSATING);
    expect(saga.failedAt).not.toBeNull();
    expect(saga.completedAt).toBeNull();
  }

  /**
   * Valida que una saga esté compensada
   */
  static expectCompensated(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.COMPENSATED);
    expect(saga.failedAt).not.toBeNull();
    expect(saga.completedAt).toBeNull();
  }

  /**
   * Valida que una saga esté en estado RETRYING
   */
  static expectRetrying(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.RETRYING);
    expect(saga.retryCount).toBeGreaterThan(0);
  }

  /**
   * Valida que una saga tenga un paso actual específico
   */
  static expectCurrentStep(saga: SagaStateEntity, expectedStep: string): void {
    expect(saga.currentStep).toBe(expectedStep);
  }

  /**
   * Valida que una saga tenga datos de estado específicos
   */
  static expectStateData(saga: SagaStateEntity, expectedData: Record<string, any>): void {
    expect(saga.stateData).toBeDefined();

    Object.keys(expectedData).forEach((key) => {
      expect(saga.stateData).toHaveProperty(key);
      expect(saga.stateData[key]).toEqual(expectedData[key]);
    });
  }

  /**
   * Valida que una saga tenga intentos de reintento
   */
  static expectRetryAttempts(saga: SagaStateEntity, minAttempts: number = 1): void {
    expect(saga.retryCount).toBeDefined();
    expect(saga.retryCount).toBeGreaterThanOrEqual(minAttempts);
  }

  /**
   * Valida que una saga no haya excedido el máximo de reintentos
   */
  static expectWithinMaxRetries(saga: SagaStateEntity, maxRetries: number): void {
    expect(saga.retryCount).toBeDefined();
    expect(saga.retryCount).toBeLessThanOrEqual(maxRetries);
  }

  /**
   * Valida que una saga tenga un tipo específico
   */
  static expectSagaType(saga: SagaStateEntity, expectedType: SagaType): void {
    expect(saga.sagaType).toBe(expectedType);
  }

  /**
   * Valida que una saga tenga timestamps válidos
   */
  static expectValidTimestamps(saga: SagaStateEntity): void {
    expect(saga.createdAt).toBeDefined();
    expect(saga.updatedAt).toBeDefined();
    expect(saga.createdAt).toBeInstanceOf(Date);
    expect(saga.updatedAt).toBeInstanceOf(Date);
    expect(saga.updatedAt.getTime()).toBeGreaterThanOrEqual(saga.createdAt.getTime());
  }

  /**
   * Valida que una saga esté asociada a un correlationId
   */
  static expectCorrelationId(saga: SagaStateEntity, expectedId?: string): void {
    expect(saga.correlationId).toBeDefined();
    expect(typeof saga.correlationId).toBe('string');

    if (expectedId) {
      expect(saga.correlationId).toBe(expectedId);
    }
  }

  /**
   * Valida que una saga esté asociada a un aggregateId
   */
  static expectAggregateId(saga: SagaStateEntity, expectedId?: string): void {
    expect(saga.aggregateId).toBeDefined();
    expect(typeof saga.aggregateId).toBe('string');

    if (expectedId) {
      expect(saga.aggregateId).toBe(expectedId);
    }
  }

  /**
   * Valida la duración de ejecución de una saga
   */
  static expectExecutionDuration(saga: SagaStateEntity, maxDurationMs: number): void {
    expect(saga.createdAt).toBeDefined();
    expect(saga.updatedAt).toBeDefined();

    const duration = saga.updatedAt.getTime() - saga.createdAt.getTime();
    expect(duration).toBeLessThanOrEqual(maxDurationMs);
  }

  /**
   * Valida que una saga no tenga errores
   */
  static expectNoErrors(saga: SagaStateEntity): void {
    expect(saga.errorDetails).toBeNull();
    expect(saga.failedAt).toBeNull();
  }

  /**
   * Valida que una saga tenga detalles de error
   */
  static expectErrorDetails(saga: SagaStateEntity, expectedError?: string): void {
    expect(saga.errorDetails).not.toBeNull();

    if (expectedError) {
      expect(saga.errorDetails).toContain(expectedError);
    }
  }

  /**
   * Valida que una saga esté en estado de timeout
   */
  static expectTimeout(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.TIMEOUT);
    expect(saga.failedAt).not.toBeNull();
  }

  /**
   * Valida que una saga esté cancelada
   */
  static expectCancelled(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.CANCELLED);
  }

  /**
   * Valida que una saga tenga compensación fallida
   */
  static expectCompensationFailed(saga: SagaStateEntity): void {
    expect(saga.status).toBe(SagaStatus.COMPENSATION_FAILED);
    expect(saga.errorDetails).not.toBeNull();
  }
}
