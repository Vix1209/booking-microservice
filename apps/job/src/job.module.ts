import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { JobController } from './job.contoller';
import { BookingReminderProcessor } from './processors/booking-reminder.processor';
import { SharedModule } from '@shared/shared';
import { DatabaseModule } from '@db/database/database.module';
import { redisConfig } from 'config/redis.config';
import { JobService } from './job.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    BullModule.registerQueue({
      name: 'booking-jobs',
    }),
    DatabaseModule,
    SharedModule,
  ],
  controllers: [JobController],
  providers: [BookingReminderProcessor, JobService],
})
export class JobModule {}
