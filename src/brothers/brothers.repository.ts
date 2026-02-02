import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Brother, NewBrother } from './entities/brother.entity';

@Injectable()
export class BrothersRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findAll(): Promise<Brother[]> {
    const rows = await this.knex('brothers')
      .select('*')
      .orderBy('id', 'asc');

    return rows.map((row) => new Brother(row));
  }

  async findById(id: number): Promise<Brother | null> {
    const row = await this.knex('brothers')
      .where({ id })
      .first();

    if (!row) return null;

    return new Brother(row);
  }

  async findByIds(ids: number[]): Promise<Brother[]> {
    const rows = await this.knex('brothers')
      .whereIn('id', ids)
      .select('*');

    return rows.map((row) => new Brother(row));
  }

  async create(data: NewBrother): Promise<Brother> {
    const [row] = await this.knex('brothers')
      .insert({
        name: data.name,
        email: data.email,
        percentage: data.percentage,
      })
      .returning('*');

    return new Brother(row);
  }

  async update(id: number, data: Partial<Omit<NewBrother, 'email'> & { email?: string }>): Promise<Brother> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Brother with id ${id} not found`);
    }

    const [row] = await this.knex('brothers')
      .where({ id })
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning('*');

    return new Brother(row);
  }

  async delete(id: number): Promise<void> {
    await this.knex('brothers')
      .where({ id })
      .delete();
  }

  async getTotalCount(): Promise<number> {
    const result = await this.knex('brothers')
      .count<{ count: string | number }>('id as count')
      .first();

    return Number(result?.count || 0);
  }

  /**
   * Get brothers with their total contributions (sum of all incomes they added)
   */
  async findWithContributions(): Promise<Array<Brother & { totalContributed: number }>> {
    const rows = await this.knex('brothers')
      .select(
        'brothers.*',
        this.knex.raw('COALESCE(SUM(incomes.amount_cents), 0) as total_contributed'),
      )
      .leftJoin('incomes', 'brothers.id', 'incomes.brother_id')
      .groupBy('brothers.id')
      .orderBy('brothers.id', 'asc');

    return rows.map((row) => ({
      ...new Brother(row),
      totalContributed: Number(row.total_contributed),
    }));
  }
}
