import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsRepository } from './statistics.repository';
import { IncomesModule } from '../incomes/incomes.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [IncomesModule, OutcomesModule, BalanceModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository],
  exports: [StatisticsService],
})
export class StatisticsModule {}
