import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { BrotherStatistics, MonthlySummary, LargestOutcome } from './entities/statistic.entity';

interface BrotherWithPercentage {
  id: number;
  name: string;
  percentage: number;
}

interface IncomeRow {
  month_key: string;
  year: number;
  month: number;
  income: string | number;
}

interface OutcomeRow {
  month_key: string;
  year: number;
  month: number;
  outcome: string | number;
}

@Injectable()
export class StatisticsRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) { }

  /**
   * Get per-brother statistics including:
   * - Total contributed (sum of incomes they added)
   * - Total share of outcomes (based on percentage splits)
   * - Net contribution (contributed - share)
   */
  async getPerBrotherStatistics(): Promise<BrotherStatistics[]> {
    // Get all brothers with their base percentages
    const brothers = await this.knex('brothers')
      .select('id', 'name', 'percentage')
      .orderBy('id', 'asc');

    const result: BrotherStatistics[] = [];

    for (const brother of brothers) {
      // Get total contributed by this brother (sum of incomes)
      const incomeResult = await this.knex('incomes')
        .where('brother_id', brother.id)
        .sum<{ sum: string | number }>('amount_cents as sum')
        .first();

        console.log('income result ', incomeResult);
        
      const totalContributed = Number(incomeResult?.sum || 0);

      // Get total share of outcomes for this brother
      const outcomeResult = await this.knex('outcome_splits')
        .where('brother_id', brother.id)
        .sum<{ sum: string | number }>('amount_cents as sum')
        .first();

      const totalShareOfOutcomes = Number(outcomeResult?.sum || 0);

      result.push({
        brotherId: brother.id,
        name: brother.name,
        percentage: Number(brother.percentage),
        totalContributed,
        totalShareOfOutcomes,
        netContribution: totalContributed - totalShareOfOutcomes,
      });
    }

    return result;
  }

  /**
   * Get monthly summary of income and outcome
   */
  async getMonthlySummary(months: number = 12): Promise<MonthlySummary[]> {
    const incomeQuery = this.knex('incomes')
      .select(
        this.knex.raw(`
          TO_CHAR(created_at, 'YYYY-MM') as month_key,
          EXTRACT(YEAR FROM created_at)::int as year,
          EXTRACT(MONTH FROM created_at)::int as month,
          SUM(amount_cents) as income
        `),
      )
      .groupByRaw(`
        TO_CHAR(created_at, 'YYYY-MM'),
        EXTRACT(YEAR FROM created_at),
        EXTRACT(MONTH FROM created_at)
      `);

    const outcomeQuery = this.knex('outcomes')
      .select(
        this.knex.raw(`
          TO_CHAR(created_at, 'YYYY-MM') as month_key,
          EXTRACT(YEAR FROM created_at)::int as year,
          EXTRACT(MONTH FROM created_at)::int as month,
          SUM(total_amount_cents) as outcome
        `),
      )
      .groupByRaw(`
        TO_CHAR(created_at, 'YYYY-MM'),
        EXTRACT(YEAR FROM created_at),
        EXTRACT(MONTH FROM created_at)
      `);

    const [incomes, outcomes] = await Promise.all([
      incomeQuery.then((res) => res as unknown as IncomeRow[]),
      outcomeQuery.then((res) => res as unknown as OutcomeRow[]),
    ]);

    // Create a map to merge data
    const summaryMap = new Map<string, MonthlySummary>();

    for (const inc of incomes) {
      summaryMap.set(inc.month_key, {
        month: inc.month_key,
        year: inc.year,
        income: Number(inc.income),
        outcome: 0,
        net: Number(inc.income),
      });
    }

    for (const out of outcomes) {
      const existing = summaryMap.get(out.month_key);
      if (existing) {
        existing.outcome = Number(out.outcome);
        existing.net = existing.income - existing.outcome;
      } else {
        summaryMap.set(out.month_key, {
          month: out.month_key,
          year: out.year,
          income: 0,
          outcome: Number(out.outcome),
          net: -Number(out.outcome),
        });
      }
    }

    // Convert to array, sort by month descending, and limit
    return Array.from(summaryMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
  }

  /**
   * Get the largest outcome
   */
  async getLargestOutcome(): Promise<LargestOutcome | null> {
    const row = await this.knex('outcomes')
      .orderBy('total_amount_cents', 'desc')
      .first();

    if (!row) return null;

    return {
      id: row.id,
      description: row.description,
      amountCents: row.total_amount_cents,
      createdAt: row.created_at,
    };
  }

  /**
   * Get total income
   */
  async getTotalIncome(): Promise<number> {
    const result = await this.knex('incomes')
      .sum<{ sum: string | number }>('amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  /**
   * Get total outcome
   */
  async getTotalOutcome(): Promise<number> {
    const result = await this.knex('outcomes')
      .sum<{ sum: string | number }>('total_amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  /**
   * Get transaction counts
   */
  async getTransactionCounts(): Promise<{ incomeCount: number; outcomeCount: number }> {
    const [incomeResult, outcomeResult] = await Promise.all([
      this.knex('incomes').count<{ count: string | number }>('id as count').first(),
      this.knex('outcomes').count<{ count: string | number }>('id as count').first(),
    ]);

    return {
      incomeCount: Number(incomeResult?.count || 0),
      outcomeCount: Number(outcomeResult?.count || 0),
    };
  }

  /**
   * Get income count per brother
   */
  async getIncomeCountByBrother(brotherId: number): Promise<number> {
    const result = await this.knex('incomes')
      .where('brother_id', brotherId)
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count || 0);
  }

  /**
   * Get outcome count where brother participated
   */
  async getOutcomeParticipationCount(brotherId: number): Promise<number> {
    const result = await this.knex('outcome_splits')
      .where('brother_id', brotherId)
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count || 0);
  }

  /**
   * Get average transaction values
   */
  async getAverageValues(): Promise<{ avgIncome: number; avgOutcome: number }> {
    const [incomeResult, outcomeResult] = await Promise.all([
      this.knex('incomes').avg<{ avg: string | number }>('amount_cents as avg').first(),
      this.knex('outcomes').avg<{ avg: string | number }>('total_amount_cents as avg').first(),
    ]);

    return {
      avgIncome: Number(incomeResult?.avg) || 0,
      avgOutcome: Number(outcomeResult?.avg) || 0,
    };
  }
}
