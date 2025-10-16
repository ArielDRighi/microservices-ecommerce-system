import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';

@Module({
  providers: [MockPaymentProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
