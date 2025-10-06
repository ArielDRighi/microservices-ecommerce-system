import { Repository } from 'typeorm';
import { SagaStateEntity, SagaStatus } from '../../src/database/entities/saga-state.entity';

/**
 * Helper para testing de Saga Pattern en E2E tests
 */
export class SagaHelper {
  /**
   * Espera a que un saga complete su ejecución
   * @param sagaRepository - Repositorio de SagaStateEntity
   * @param sagaId - ID del saga
   * @param timeout - Tiempo máximo de espera en ms
   */
  static async waitForSagaCompletion(
    sagaRepository: Repository<SagaStateEntity>,
    sagaId: string,
    timeout: number = 30000,
  ): Promise<SagaStateEntity> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const saga = await sagaRepository.findOne({ where: { id: sagaId } });

      if (!saga) {
        throw new Error(`Saga ${sagaId} not found`);
      }

      if (
        saga.status === SagaStatus.COMPLETED ||
        saga.status === SagaStatus.COMPENSATED ||
        saga.status === SagaStatus.FAILED
      ) {
        return saga;
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for saga ${sagaId} to complete after ${timeout}ms`);
  }

  /**
   * Espera a que un saga llegue a un step específico
   * @param sagaRepository - Repositorio de SagaStateEntity
   * @param sagaId - ID del saga
   * @param expectedStep - Step esperado
   * @param timeout - Tiempo máximo de espera en ms
   */
  static async waitForSagaStep(
    sagaRepository: Repository<SagaStateEntity>,
    sagaId: string,
    expectedStep: string,
    timeout: number = 30000,
  ): Promise<SagaStateEntity> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const saga = await sagaRepository.findOne({ where: { id: sagaId } });

      if (!saga) {
        throw new Error(`Saga ${sagaId} not found`);
      }

      if (saga.currentStep === expectedStep) {
        return saga;
      }

      // If saga already failed or compensated, throw error
      if (saga.status === SagaStatus.FAILED || saga.status === SagaStatus.COMPENSATED) {
        throw new Error(
          `Saga ${sagaId} ended with status ${saga.status} before reaching step ${expectedStep}`,
        );
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const currentSaga = await sagaRepository.findOne({ where: { id: sagaId } });
    throw new Error(
      `Timeout waiting for saga ${sagaId} to reach step ${expectedStep}. ` +
        `Current step: ${currentSaga?.currentStep}, Status: ${currentSaga?.status}`,
    );
  }

  /**
   * Obtiene el estado actual de un saga
   * @param sagaRepository - Repositorio de SagaStateEntity
   * @param sagaId - ID del saga
   */
  static async getSagaState(
    sagaRepository: Repository<SagaStateEntity>,
    sagaId: string,
  ): Promise<SagaStateEntity> {
    const saga = await sagaRepository.findOne({ where: { id: sagaId } });

    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    return saga;
  }

  /**
   * Verifica si un saga ejecutó compensación
   * @param sagaRepository - Repositorio de SagaStateEntity
   * @param sagaId - ID del saga
   */
  static async assertSagaCompensation(
    sagaRepository: Repository<SagaStateEntity>,
    sagaId: string,
  ): Promise<void> {
    const saga = await sagaRepository.findOne({ where: { id: sagaId } });

    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    if (saga.status !== SagaStatus.COMPENSATED) {
      throw new Error(`Expected saga ${sagaId} to be compensated, but status is ${saga.status}`);
    }
  }

  /**
   * Verifica que un saga esté en un step específico
   * @param sagaRepository - Repositorio de SagaStateEntity
   * @param sagaId - ID del saga
   * @param expectedStep - Step esperado
   */
  static async assertSagaStep(
    sagaRepository: Repository<SagaStateEntity>,
    sagaId: string,
    expectedStep: string,
  ): Promise<void> {
    const saga = await sagaRepository.findOne({ where: { id: sagaId } });

    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    if (saga.currentStep !== expectedStep) {
      throw new Error(
        `Expected saga ${sagaId} to be at step ${expectedStep}, but current step is ${saga.currentStep}`,
      );
    }
  }
}
