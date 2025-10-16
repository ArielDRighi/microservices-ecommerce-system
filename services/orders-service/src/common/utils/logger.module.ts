import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonLoggerService } from './winston-logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}
