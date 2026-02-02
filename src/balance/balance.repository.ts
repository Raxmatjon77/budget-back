import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { SharedBalance } from './entities/balance.entity';

@Injectable()
export class BalanceRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Get the current shared balance (singleton - always returns row with id=1)
   * Uses FOR UPDATE to lock the row when called within a transaction
   */
  async getBalance(trx?: Knex.Transaction | Knex): Promise<SharedBalance> {
    const query = (trx || this.knex)('shared_balance')
      .select('*')
      .first();

    // Use FOR UPDATE if we're in a transaction (for pessimistic locking)
    if (trx && trx.isTransaction) {
      query.forUpdate();
    }

    const row = await query;

    return new SharedBalance({
      id: row.id,
      balanceCents: row.balance_cents,
      lastUpdated: row.last_updated,
    });
  }

  /**
   * Update the balance within a transaction
   */
  async updateBalance(
    trx: Knex.Transaction,
    balanceCents: number,
  ): Promise<SharedBalance> {
    const [row] = await trx('shared_balance')
      .where({ id: 1 })
      .update({
        balance_cents: balanceCents,
        last_updated: new Date(),
      })
      .returning('*');

    return new SharedBalance({
      id: row.id,
      balanceCents: row.balance_cents,
      lastUpdated: row.last_updated,
    });
  }

  /**
   * Add to the balance (for income)
   */
  async addBalance(
    trx: Knex.Transaction,
    amountCents: number,
  ): Promise<SharedBalance> {
    const current = await this.getBalance(trx);
    return this.updateBalance(trx, current.balanceCents + amountCents);
  }

  /**
   * Subtract from the balance (for outcome)
   */
  async subtractBalance(
    trx: Knex.Transaction,
    amountCents: number,
  ): Promise<SharedBalance> {
    const current = await this.getBalance(trx);
    const newBalance = current.balanceCents - amountCents;

    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    return this.updateBalance(trx, newBalance);
  }

  /**
   * Check if balance is sufficient for a given amount
   */
  async isSufficient(amountCents: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance.balanceCents >= amountCents;
  }
}
