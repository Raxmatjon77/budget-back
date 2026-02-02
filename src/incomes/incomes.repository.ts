import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Income, NewIncome } from './entities/income.entity';

export interface IncomeWithBrother extends Income {
  brotherName: string;
  brotherEmail: string | null;
}

@Injectable()
export class IncomesRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findAll(options: {
    limit?: number;
    offset?: number;
    brotherId?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<IncomeWithBrother[]> {
    const { limit = 50, offset = 0, brotherId, startDate, endDate } = options;

    let query = this.knex('incomes')
      .select(
        'incomes.*',
        'brothers.name as brother_name',
        'brothers.email as brother_email',
      )
      .leftJoin('brothers', 'incomes.brother_id', 'brothers.id')
      .orderBy('incomes.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (brotherId) {
      query = query.where('incomes.brother_id', brotherId);
    }

    if (startDate) {
      query = query.where('incomes.created_at', '>=', startDate);
    }

    if (endDate) {
      query = query.where('incomes.created_at', '<=', endDate);
    }

    const rows = await query;

    return rows.map((row) => ({
      id: row.id,
      brotherId: row.brother_id,
      amountCents: row.amount_cents,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      brotherName: row.brother_name,
      brotherEmail: row.brother_email,
    }));
  }

  async findById(id: number): Promise<Income | null> {
    const row = await this.knex('incomes')
      .where({ id })
      .first();

    if (!row) return null;

    return new Income({
      id: row.id,
      brotherId: row.brother_id,
      amountCents: row.amount_cents,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Create a new income record within a transaction
   */
  async create(trx: Knex.Transaction, data: NewIncome): Promise<Income> {
    const [row] = await trx('incomes')
      .insert({
        brother_id: data.brotherId,
        amount_cents: data.amountCents,
        description: data.description,
      })
      .returning('*');

    return new Income({
      id: row.id,
      brotherId: row.brother_id,
      amountCents: row.amount_cents,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async getTotalAmount(): Promise<number> {
    const result = await this.knex('incomes')
      .sum<{ sum: string | number }>('amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  async getTotalAmountByBrother(brotherId: number): Promise<number> {
    const result = await this.knex('incomes')
      .where({ brother_id: brotherId })
      .sum<{ sum: string | number }>('amount_cents as sum')
      .first();

    return Number(result?.sum) || 0;
  }

  async count(): Promise<number> {
    const result = await this.knex('incomes')
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count) || 0;
  }

  async countByBrother(brotherId: number): Promise<number> {
    const result = await this.knex('incomes')
      .where({ brother_id: brotherId })
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count) || 0;
  }

  async getTotalByMonth(
    year?: number,
    month?: number,
  ): Promise<Array<{ month: string; income: number }>> {
    let query = this.knex('incomes')
      .select(
        this.knex.raw(`
          TO_CHAR(created_at, 'YYYY-MM') as month
        `),
        this.knex.raw('SUM(amount_cents) as income'),
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
      income: Number(row.income),
    }));
  }
}
