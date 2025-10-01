import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  OrderProcessingJobData,
  PaymentProcessingJobData,
  InventoryManagementJobData,
  NotificationSendingJobData,
} from '../common/interfaces/queue-job.interface';

/**
 * Bull Board Controller
 * Provides a web UI for monitoring and managing Bull queues
 * Access at: http://localhost:3002/api/v1/admin/queues
 */
@Controller('admin/queues')
export class BullBoardController {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue('order-processing')
    private readonly orderQueue: Queue<OrderProcessingJobData>,

    @InjectQueue('payment-processing')
    private readonly paymentQueue: Queue<PaymentProcessingJobData>,

    @InjectQueue('inventory-management')
    private readonly inventoryQueue: Queue<InventoryManagementJobData>,

    @InjectQueue('notification-sending')
    private readonly notificationQueue: Queue<NotificationSendingJobData>,
  ) {
    this.setupBullBoard();
  }

  /**
   * Setup Bull Board with all queues
   */
  private setupBullBoard(): void {
    this.serverAdapter = new ExpressAdapter();
    // Set base path to match the full route including API prefix
    this.serverAdapter.setBasePath('/api/v1/admin/queues');

    createBullBoard({
      queues: [
        new BullAdapter(this.orderQueue),
        new BullAdapter(this.paymentQueue),
        new BullAdapter(this.inventoryQueue),
        new BullAdapter(this.notificationQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Serve Bull Board UI
   * Handles all routes under /admin/queues/*
   */
  @Get('*')
  bullBoard(@Req() req: Request, @Res() res: Response): void {
    const router = this.serverAdapter.getRouter();
    router(req, res);
  }

  /**
   * Redirect root path to Bull Board UI
   */
  @Get()
  redirectToUI(@Res() res: Response): void {
    res.redirect('/api/v1/admin/queues/');
  }
}
