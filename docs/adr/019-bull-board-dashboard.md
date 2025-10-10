# ADR-019: Bull Board Queue Dashboard

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-008 (Bull Queue System), ADR-012 (Dead Letter Queue)

---

## Context

Need **visual dashboard** to monitor Bull queues: view jobs, inspect failures, retry manually, check DLQ (dead letter queue).

---

## Decision

Use **@bull-board/express** for web-based queue monitoring:

```typescript
/**
 * Bull Board Controller
 * Location: src/queues/bull-board.controller.ts
 */
@Controller('admin/queues')
export class BullBoardController {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue('order-processing') private readonly orderQueue: Queue,
    @InjectQueue('payment-processing') private readonly paymentQueue: Queue,
    @InjectQueue('inventory-management') private readonly inventoryQueue: Queue,
    @InjectQueue('notification-sending') private readonly notificationQueue: Queue,
  ) {
    this.setupBullBoard();
  }

  private setupBullBoard(): void {
    this.serverAdapter = new ExpressAdapter();
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

  @Get('*')
  bullBoard(@Req() req: Request, @Res() res: Response): void {
    const router = this.serverAdapter.getRouter();
    router(req, res);
  }
}
```

**main.ts Setup:**

```typescript
// Mount Bull Board before setting global prefix
app.use('/api/v1/admin/queues', serverAdapter.getRouter());
logger.log('📊 Bull Board: http://localhost:3002/api/v1/admin/queues');
```

---

## Dashboard Features

**Access:** `http://localhost:3002/api/v1/admin/queues`

**Views:**

1. **Overview:** All queues, job counts (active, waiting, completed, failed)
2. **Queue Details:** Specific queue, paginated job list
3. **Job Inspector:** View job data, error stack, logs
4. **Actions:**
   - Retry failed jobs (individual or bulk)
   - Delete jobs
   - Promote jobs (move to front of queue)
   - View job timeline (queued → active → completed/failed)

**Real-Time Updates:** Auto-refresh job counts, state changes

---

## Queue Monitoring

```
┌─────────────────────────────────────────────────────────┐
│ Bull Board Dashboard                                    │
├─────────────────────────────────────────────────────────┤
│ order-processing                                        │
│   ● Active: 3   ● Waiting: 45   ✓ Completed: 1,234     │
│   ✗ Failed: 5   (View DLQ)                              │
├─────────────────────────────────────────────────────────┤
│ payment-processing                                      │
│   ● Active: 1   ● Waiting: 12   ✓ Completed: 456       │
│   ✗ Failed: 2   (View DLQ)                              │
├─────────────────────────────────────────────────────────┤
│ inventory-management                                    │
│   ● Active: 0   ● Waiting: 3    ✓ Completed: 789       │
│   ✗ Failed: 0                                           │
├─────────────────────────────────────────────────────────┤
│ notification-sending                                    │
│   ● Active: 2   ● Waiting: 34   ✓ Completed: 2,345     │
│   ✗ Failed: 1   (View DLQ)                              │
└─────────────────────────────────────────────────────────┘
```

---

## DLQ Management

**Failed Jobs View:**

```
Job ID: 12345
Status: Failed
Attempts: 3/3
Error: ETIMEDOUT: Payment gateway timeout
Stack Trace: [View Full]

Job Data:
{
  "orderId": "order-123",
  "paymentMethod": "stripe",
  "amount": 99.99
}

Actions:
[Retry Job]  [Delete Job]  [View Logs]
```

**Bulk Actions:**

- Retry all failed jobs in queue
- Delete all failed jobs older than 30 days
- Export failed jobs as JSON

---

## Benefits

✅ **Visual Monitoring:** See queue health at a glance  
✅ **DLQ Inspection:** Debug failed jobs with full context  
✅ **Manual Recovery:** Retry jobs without code deploy  
✅ **Debugging:** View job data, errors, stack traces  
✅ **Zero Setup:** Bull Board auto-discovers queues  
✅ **Production Ready:** Used in production by many companies

---

## Use Cases

**1. Post-Incident Recovery**

```
Payment gateway was down for 2 hours
→ 150 payment jobs moved to DLQ
→ Gateway recovered
→ Bull Board: Select all failed payments → Retry
→ All 150 jobs processed successfully
```

**2. Debugging Production Bug**

```
Order processing failing with "Cannot read property 'x' of undefined"
→ Bull Board: View failed order job
→ Inspect job data
→ Notice: shipping address is null (validation bug)
→ Fix code, redeploy, retry jobs
```

**3. Queue Health Monitoring**

```
Bull Board shows: order-processing has 1,200 waiting jobs (unusual)
→ Check payment circuit breaker: OPEN (Stripe API down)
→ Wait for Stripe recovery
→ Circuit breaker closes, jobs process automatically
```

---

## Security Considerations

**Current:** No authentication (dev only)

**Planned for Production:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Admin only
@Controller('admin/queues')
export class BullBoardController {
  /* ... */
}
```

**Alternative:** IP whitelist, VPN access, or separate admin service

---

**Status:** ✅ **IMPLEMENTED AND OPERATIONAL**  
**URL:** `http://localhost:3002/api/v1/admin/queues`  
**Queues Monitored:** 4 (order, payment, inventory, notification)  
**Related:** ADR-012 (DLQ Handling), ADR-008 (Bull Queue System)
