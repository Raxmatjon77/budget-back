import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from './knex.module';

@Injectable()
export class KnexService implements OnModuleDestroy {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  get connection(): Knex {
    return this.knex;
  }

  /**
   * Execute a callback within a transaction.
   * Automatically commits on success or rolls back on error.
   */
  async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.knex.transaction(callback);
  }

  /**
   * Get a query builder for a specific table
   */
  public table<T = any>(tableName: string): Knex.QueryBuilder<T, any[]> {
    return this.knex<T>(tableName);
  }

  async onModuleDestroy() {
    await this.knex.destroy();
  }
}
