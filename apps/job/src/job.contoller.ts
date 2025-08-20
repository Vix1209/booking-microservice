import { Controller, Get, Post, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JobService } from './job.service';

@ApiTags('Job Processing')
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: 'Get service status' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  getHello(): string {
    return this.jobService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async getHealthCheck() {
    return this.jobService.getHealthCheck();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get job processing metrics' })
  @ApiResponse({ status: 200, description: 'Job metrics and statistics' })
  async getMetrics() {
    return this.jobService.getJobMetrics();
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats() {
    return this.jobService.getQueueStats();
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup completed jobs' })
  @ApiQuery({
    name: 'maxAge',
    required: false,
    type: Number,
    description: 'Maximum age in milliseconds (default: 24 hours)',
  })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupJobs(
    @Query('maxAge', new ParseIntPipe({ optional: true }))
    maxAge?: number,
  ) {
    return this.jobService.cleanupCompletedJobs(maxAge);
  }
}
