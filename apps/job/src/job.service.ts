import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { RedisService } from '@shared/shared';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectQueue('booking-jobs')
    private readonly bookingQueue: bull.Queue,
    private readonly redisService: RedisService,
  ) {}

  getHello(): string {
    return 'Job Processing Service is running!';
  }

  async getHealthCheck() {
    try {
      // Check Redis connection
      const redisStatus = await this.redisService.ping();

      // Check queue status
      const queueStatus = await this.getQueueStats();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          redis: redisStatus ? 'healthy' : 'unhealthy',
          queue: 'healthy',
        },
        queue: queueStatus,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error.stack);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.bookingQueue.getWaiting(),
        this.bookingQueue.getActive(),
        this.bookingQueue.getCompleted(),
        this.bookingQueue.getFailed(),
        this.bookingQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total:
          waiting.length +
          active.length +
          completed.length +
          failed.length +
          delayed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error.stack);
      throw error;
    }
  }

  async getJobMetrics() {
    try {
      const stats = await this.getQueueStats();
      const failedJobs = await this.bookingQueue.getFailed();

      // Get recent failed jobs with details
      const recentFailures = failedJobs.slice(-10).map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));

      return {
        stats,
        recentFailures,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get job metrics:', error.stack);
      throw error;
    }
  }

  async cleanupCompletedJobs(maxAge: number = 24 * 60 * 60 * 1000) {
    try {
      // Clean up completed jobs older than maxAge (default 24 hours)
      await this.bookingQueue.clean(maxAge, 'completed');
      await this.bookingQueue.clean(maxAge, 'failed');

      this.logger.log(`Cleaned up jobs older than ${maxAge}ms`);

      return {
        success: true,
        message: `Cleaned up jobs older than ${maxAge}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to cleanup jobs:', error.stack);
      throw error;
    }
  }
}
