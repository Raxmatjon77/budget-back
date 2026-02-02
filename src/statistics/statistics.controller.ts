import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsResponse } from '../common/interfaces/transaction-response.interface';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(): Promise<StatisticsResponse> {
    return this.statisticsService.getStatistics();
  }

  @Get('monthly')
  async getMonthlySummary(
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months?: number,
  ) {
    return this.statisticsService.getMonthlySummary(months);
  }

  @Get('per-brother')
  async getPerBrotherStatistics() {
    return this.statisticsService.getPerBrotherStatistics();
  }
}
