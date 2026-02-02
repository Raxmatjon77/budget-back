import { Injectable } from '@nestjs/common';
import { StatisticsRepository } from './statistics.repository';
import { IncomesRepository } from '../incomes/incomes.repository';
import { OutcomesRepository } from '../outcomes/outcomes.repository';
import { BalanceRepository } from '../balance/balance.repository';
import { Statistics, MonthlySummary } from './entities/statistic.entity';
import { StatisticsResponse } from '../common/interfaces/transaction-response.interface';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly incomesRepository: IncomesRepository,
    private readonly outcomesRepository: OutcomesRepository,
    private readonly balanceRepository: BalanceRepository,
  ) {}

  /**
   * Get comprehensive statistics for the family finance system
   */
  async getStatistics(): Promise<StatisticsResponse> {
    const [
      perBrother,
      monthlySummary,
      largestOutcome,
      totalIncome,
      totalOutcome,
      transactionCounts,
      currentBalance,
    ] = await Promise.all([
      this.statisticsRepository.getPerBrotherStatistics(),
      this.statisticsRepository.getMonthlySummary(12),
      this.statisticsRepository.getLargestOutcome(),
      this.incomesRepository.getTotalAmount(),
      this.outcomesRepository.getTotalAmount(),
      this.statisticsRepository.getTransactionCounts(),
      this.balanceRepository.getBalance(),
    ]);

    return {
      totalIncome,
      totalOutcome,
      currentBalance: currentBalance.balanceCents,
      perBrother,
      largestOutcome,
      monthlySummary: monthlySummary.map(m => ({
        month: m.month,
        income: m.income,
        outcome: m.outcome,
        net: m.net,
      })),
      outcomeCount: transactionCounts.outcomeCount,
      incomeCount: transactionCounts.incomeCount,
    };
  }

  /**
   * Get monthly summary data
   */
  async getMonthlySummary(months: number = 12): Promise<MonthlySummary[]> {
    return this.statisticsRepository.getMonthlySummary(months);
  }

  /**
   * Get per-brother statistics
   */
  async getPerBrotherStatistics() {
    return this.statisticsRepository.getPerBrotherStatistics();
  }
}
