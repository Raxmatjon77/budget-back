import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Transaction, TransactionWithDetails, TransactionType } from './entities/transaction.entity';

export interface TransactionLogEntry {
  id: number;
  transactionType: TransactionType;
  referenceId: number;
  brotherId?: number;
  amountCents: number;
  balanceAfterCents: number;
  createdAt: Date;
}

@Injectable()
export class TransactionsRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Log a transaction (within a transaction)
   */
  async logTransaction(
    trx: Knex.Transaction,
    data: {
      transactionType: TransactionType;
      referenceId: number;
      brotherId?: number;
      amountCents: number;
      balanceAfterCents: number;
    },
  ): Promise<void> {
    await trx('transaction_log').insert({
      transaction_type: data.transactionType,
      reference_id: data.referenceId,
      brother_id: data.brotherId,
      amount_cents: data.amountCents,
      balance_after_cents: data.balanceAfterCents,
    });
  }

  /**
   * Get transaction history with optional filters
   */
  async findHistory(options: {
    limit?: number;
    offset?: number;
    type?: TransactionType | 'all';
    brotherId?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<TransactionWithDetails[]> {
    const {
      limit = 50,
      offset = 0,
      type = 'all',
      brotherId,
      startDate,
      endDate,
    } = options;

    // Get income transactions
    let incomeQuery = this.knex('incomes')
      .select(
        'incomes.id',
        this.knex.raw("'income' as type"),
        'incomes.amount_cents',
        'incomes.created_at as created_at',
        'incomes.brother_id',
        'brothers.name as brother_name',
        'incomes.description',
      )
      .leftJoin('brothers', 'incomes.brother_id', 'brothers.id');

    // Get outcome transactions
    let outcomeQuery = this.knex('outcomes')
      .select(
        'outcomes.id',
        this.knex.raw("'outcome' as type"),
        'outcomes.total_amount_cents as amount_cents',
        'outcomes.created_at as created_at',
        'outcomes.created_by as brother_id',
        'brothers.name as brother_name',
        'outcomes.description',
      )
      .leftJoin('brothers', 'outcomes.created_by', 'brothers.id');

    // Apply filters
    const applyFilters = (query: any) => {
      if (startDate) {
        query.where('created_at', '>=', startDate);
      }
      if (endDate) {
        query.where('created_at', '<=', endDate);
      }
      if (brotherId) {
        query.where('brother_id', brotherId);
      }
      return query;
    };

    incomeQuery = applyFilters(incomeQuery);
    outcomeQuery = applyFilters(outcomeQuery);

    // Combine results
    const [incomes, outcomes] = await Promise.all([
      incomeQuery,
      outcomeQuery,
    ]);

    // Map and combine
    const allTransactions: TransactionWithDetails[] = [
      ...incomes.map((row: any) => ({
        id: row.id,
        type: row.type as TransactionType,
        amountCents: Number(row.amount_cents),
        createdAt: row.created_at,
        brotherId: row.brother_id,
        brotherName: row.brother_name,
        description: row.description,
        splits: undefined,
        balanceAfterCents: 0,
      })),
      ...outcomes.map((row: any) => ({
        id: row.id,
        type: row.type as TransactionType,
        amountCents: Number(row.amount_cents),
        createdAt: row.created_at,
        brotherId: row.brother_id,
        brotherName: row.brother_name,
        description: row.description,
        splits: undefined, // Will be populated separately if needed
        balanceAfterCents: 0,
      })),
    ];

    // Sort by created_at descending
    allTransactions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Apply type filter
    const filtered = type !== 'all'
      ? allTransactions.filter(t => t.type === type)
      : allTransactions;

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    // Get balance after each transaction (from transaction_log)
    for (const tx of paginated) {
      const log = await this.knex('transaction_log')
        .where({
          transaction_type: tx.type,
          reference_id: tx.id,
        })
        .select('balance_after_cents')
        .first();

      tx.balanceAfterCents = log?.balance_after_cents || 0;
    }

    // Get splits for outcomes
    for (const tx of paginated) {
      if (tx.type === 'outcome') {
        tx.splits = await this.getOutcomeSplits(tx.id);
      }
    }

    return paginated;
  }

  /**
   * Get splits for a specific outcome
   */
  async getOutcomeSplits(outcomeId: number): Promise<Array<{
    brotherId: number;
    brotherName: string;
    percentage: number;
    amountCents: number;
  }>> {
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
   * Get balance history over time
   */
  async getBalanceHistory(limit: number = 30): Promise<Array<{
    date: Date;
    balance: number;
  }>> {
    const rows = await this.knex('transaction_log')
      .select('created_at', 'balance_after_cents')
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map(row => ({
      date: row.created_at,
      balance: row.balance_after_cents,
    })).reverse();
  }

  /**
   * Get total count of transactions
   */
  async count(): Promise<number> {
    const incomeCount = await this.knex('incomes').count<{ count: string | number }>('id as count').first();
    const outcomeCount = await this.knex('outcomes').count<{ count: string | number }>('id as count').first();

    return Number(incomeCount?.count || 0) + Number(outcomeCount?.count || 0);
  }
}
