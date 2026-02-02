import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Outcome, NewOutcome } from './entities/outcome.entity';

export interface OutcomeWithDetails {
  id: number;
  description: string;
  totalAmountCents: number;
  createdById: number;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  splits: Array<{
    brotherId: number;
    brotherName: string;
    percentage: number;
    amountCents: number;
  }>;
}

export interface OutcomeSplitWithBrother {
  brotherId: number;
  brotherName: string;
  percentage: number;
  amountCents: number;
}

@Injectable()
export class OutcomesRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findAll(options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<OutcomeWithDetails[]> {
    const { limit = 50, offset = 0, startDate, endDate } = options;

    // Get outcomes with splits
    let query = this.knex('outcomes')
      .select(
        'outcomes.*',
        'brothers.name as created_by_name',
      )
      .leftJoin('brothers', 'outcomes.created_by', 'brothers.id')
      .orderBy('outcomes.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (startDate) {
      query = query.where('outcomes.created_at', '>=', startDate);
    }

    if (endDate) {
      query = query.where('outcomes.created_at', '<=', endDate);
    }

    const outcomes = await query;

    // Get splits for each outcome
    const result: OutcomeWithDetails[] = [];
    for (const outcome of outcomes) {
      const splits = await this.getSplitsForOutcome(outcome.id);

      result.push({
        id: outcome.id,
        description: outcome.description,
        totalAmountCents: outcome.total_amount_cents,
        createdById: outcome.created_by,
        createdByName: outcome.created_by_name,
        createdAt: outcome.created_at,
        updatedAt: outcome.updated_at,
        splits: splits.map(s => ({
          brotherId: s.brotherId,
          brotherName: s.brotherName,
          percentage: s.percentage,
          amountCents: s.amountCents,
        })),
      });
    }

    return result;
  }

  async findById(id: number): Promise<OutcomeWithDetails | null> {
    const outcome = await this.knex('outcomes')
      .select(
        'outcomes.*',
        'brothers.name as created_by_name',
      )
      .leftJoin('brothers', 'outcomes.created_by', 'brothers.id')
      .where('outcomes.id', id)
      .first();

    if (!outcome) return null;

    const splits = await this.getSplitsForOutcome(outcome.id);

    return {
      id: outcome.id,
      description: outcome.description,
      totalAmountCents: outcome.total_amount_cents,
      createdById: outcome.created_by,
      createdByName: outcome.created_by_name,
      createdAt: outcome.created_at,
      updatedAt: outcome.updated_at,
      splits: splits.map(s => ({
        brotherId: s.brotherId,
        brotherName: s.brotherName,
        percentage: s.percentage,
        amountCents: s.amountCents,
      })),
    };
  }

  async getSplitsForOutcome(outcomeId: number): Promise<OutcomeSplitWithBrother[]> {
    const rows = await this.knex('outcome_splits')
      .select(
        'outcome_splits.brother_id',
        'outcome_splits.percentage',
        'outcome_splits.amount_cents',
        'brothers.name as brother_name',
      )
      .leftJoin('brothers', 'outcome_splits.brother_id', 'brothers.id')
      .where('outcome_splits.outcome_id', outcomeId);

    return rows.map(row => ({
      brotherId: row.brother_id,
      brotherName: row.brother_name,
      percentage: Number(row.percentage),
      amountCents: row.amount_cents,
    }));
  }

  /**
   * Create a new outcome record within a transaction
   */
  async create(
    trx: Knex.Transaction,
    data: Omit<NewOutcome, 'splits'>,
  ): Promise<Outcome> {
    const [row] = await trx('outcomes')
      .insert({
        description: data.description,
        total_amount_cents: data.totalAmountCents,
        created_by: data.createdById,
      })
      .returning('*');

    return new Outcome({
      id: row.id,
      description: row.description,
      totalAmountCents: row.total_amount_cents,
      createdById: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Create outcome splits within a transaction
   */
  async createSplits(
    trx: Knex.Transaction,
    outcomeId: number,
    splits: Array<{ brotherId: number; percentage: number; amountCents: number }>,
  ): Promise<void> {
    const data = splits.map(split => ({
      outcome_id: outcomeId,
      brother_id: split.brotherId,
      percentage: split.percentage,
      amount_cents: split.amountCents,
    }));

    await trx('outcome_splits').insert(data);
  }

  async getTotalAmount(): Promise<number> {
    const result = await this.knex('outcomes')
      .sum<{ sum: string | number }>('total_amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  /**
   * Get total amount a brother is responsible for based on percentage splits
   */
  async getTotalShareByBrother(brotherId: number): Promise<number> {
    const result = await this.knex('outcome_splits')
      .where('brother_id', brotherId)
      .sum<{ sum: string | number }>('amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  async count(): Promise<number> {
    const result = await this.knex('outcomes')
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count) || 0;
  }

  async findLargest(): Promise<Outcome | null> {
    const row = await this.knex('outcomes')
      .orderBy('total_amount_cents', 'desc')
      .first();

    if (!row) return null;

    return new Outcome({
      id: row.id,
      description: row.description,
      totalAmountCents: row.total_amount_cents,
      createdById: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async getTotalByMonth(
    year?: number,
    month?: number,
  ): Promise<Array<{ month: string; outcome: number }>> {
    let query = this.knex('outcomes')
      .select(
        this.knex.raw(`
          TO_CHAR(created_at, 'YYYY-MM') as month
        `),
        this.knex.raw('SUM(total_amount_cents) as outcome'),
      )
      .groupByRaw('TO_CHAR(created_at, \'YYYY-MM\')')
      .orderByRaw('TO_CHAR(created_at, \'YYYY-MM\') DESC');

    if (year && month) {
      query = query.whereRaw(`
        EXTRACT(YEAR FROM created_at) = ? AND
        EXTRACT(MONTH FROM created_at) = ?
      `, [year, month]);
    }

    const rows = await query;
    return rows.map((row: any) => ({
      month: row.month,
      outcome: Number(row.outcome),
    }));
  }
}
