import { Queue, Job } from 'bull';

/**
 * Helper para testing de Bull Queues en E2E tests
 */
export class QueueHelper {
  /**
   * Espera a que un job complete su ejecución
   * @param queue - Instancia de la cola
   * @param jobId - ID del job
   * @param timeout - Tiempo máximo de espera en ms
   */
  static async waitForJob(queue: Queue, jobId: string, timeout: number = 30000): Promise<Job> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found in queue`);
      }

      const isCompleted = await job.isCompleted();
      if (isCompleted) {
        return job;
      }

      const isFailed = await job.isFailed();
      if (isFailed) {
        const failedReason = job.failedReason;
        throw new Error(`Job ${jobId} failed: ${failedReason}`);
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for job ${jobId} to complete after ${timeout}ms`);
  }

  /**
   * Limpia todos los jobs de una cola
   * @param queue - Instancia de la cola
   */
  static async clearQueue(queue: Queue): Promise<void> {
    await queue.empty();
    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
    await queue.clean(0, 'delayed');
    await queue.clean(0, 'active');
    await queue.clean(0, 'wait');
  }

  /**
   * Obtiene el estado de un job
   * @param queue - Instancia de la cola
   * @param jobId - ID del job
   */
  static async getJobStatus(
    queue: Queue,
    jobId: string,
  ): Promise<'completed' | 'failed' | 'active' | 'waiting' | 'delayed' | 'unknown'> {
    const job = await queue.getJob(jobId);

    if (!job) {
      return 'unknown';
    }

    if (await job.isCompleted()) return 'completed';
    if (await job.isFailed()) return 'failed';
    if (await job.isActive()) return 'active';
    if (await job.isWaiting()) return 'waiting';
    if (await job.isDelayed()) return 'delayed';

    return 'unknown';
  }

  /**
   * Obtiene la cantidad de jobs en una cola
   * @param queue - Instancia de la cola
   */
  static async getQueueLength(queue: Queue): Promise<number> {
    const counts = await queue.getJobCounts();
    return counts.waiting + counts.active + counts.delayed;
  }

  /**
   * Obtiene todos los jobs fallidos de una cola
   * @param queue - Instancia de la cola
   */
  static async getFailedJobs(queue: Queue): Promise<Job[]> {
    return await queue.getFailed();
  }

  /**
   * Espera a que todos los jobs activos de una cola terminen
   * @param queue - Instancia de la cola
   * @param timeout - Tiempo máximo de espera en ms
   */
  static async waitForQueueEmpty(queue: Queue, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const counts = await queue.getJobCounts();
      const activeJobs = counts.active + counts.waiting;

      if (activeJobs === 0) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for queue to be empty after ${timeout}ms`);
  }

  /**
   * Obtiene el resultado de un job completado
   * @param queue - Instancia de la cola
   * @param jobId - ID del job
   */
  static async getJobResult<T = any>(queue: Queue, jobId: string): Promise<T> {
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (!(await job.isCompleted())) {
      throw new Error(`Job ${jobId} is not completed yet`);
    }

    return job.returnvalue as T;
  }
}
