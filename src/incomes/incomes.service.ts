import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IncomesRepository, IncomeWithBrother } from './incomes.repository';
import { BalanceRepository } from '../balance/balance.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { BrothersRepository } from '../brothers/brothers.repository';
import { CreateIncomeDto } from '../common/dto/create-income.dto';
import { Income } from './entities/income.entity';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Knex } from 'knex';

@Injectable()
export class IncomesService {
  constructor(
    private readonly incomesRepository: IncomesRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly brothersRepository: BrothersRepository,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  /**
   * Create a new income transaction.
   * This is a critical operation that MUST be done within a database transaction
   * to ensure atomicity and prevent race conditions.
   *
   * Steps:
   * 1. Verify brother exists
   * 2. Start database transaction
   * 3. Lock the balance row (FOR UPDATE)
   * 4. Insert income record
   * 5. Update balance (add amount)
   * 6. Log transaction in transaction_log
   * 7. Commit transaction
   *
   * @param dto - The income data
   * @returns The created income record
   */
  async create(dto: CreateIncomeDto): Promise<Income> {
    // 1. Verify brother exists
    const brother = await this.brothersRepository.findById(dto.brotherId);
    if (!brother) {
      throw new NotFoundException(`Brother with id ${dto.brotherId} not found`);
    }

    // 2. Use a transaction for atomicity
    return this.knex.transaction(async (trx) => {
      // 3. Get and lock the balance (FOR UPDATE)
      const balanceBefore = await this.balanceRepository.getBalance(trx);

      // 4. Insert income record
      const income = await this.incomesRepository.create(trx, {
        brotherId: dto.brotherId,
        amountCents: dto.amountCents,
        description: dto.description,
      });

      // 5. Update balance (add amount)
      const balanceAfter = await this.balanceRepository.addBalance(trx, dto.amountCents);

      // 6. Log transaction
      await this.transactionsRepository.logTransaction(trx, {
        transactionType: 'income',
        referenceId: income.id,
        brotherId: dto.brotherId,
        amountCents: dto.amountCents,
        balanceAfterCents: balanceAfter.balanceCents,
      });

      // 7. Transaction commits automatically if no error is thrown
      return income;
    });
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    brotherId?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<IncomeWithBrother[]> {
    return this.incomesRepository.findAll(options);
  }

  async findById(id: number): Promise<Income> {
    const income = await this.incomesRepository.findById(id);
    if (!income) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    return income;
  }

  async getTotalAmount(): Promise<number> {
    return this.incomesRepository.getTotalAmount();
  }

  async getTotalAmountByBrother(brotherId: number): Promise<number> {
    return this.incomesRepository.getTotalAmountByBrother(brotherId);
  }

  async count(): Promise<number> {
    return this.incomesRepository.count();
  }

  async countByBrother(brotherId: number): Promise<number> {
    return this.incomesRepository.countByBrother(brotherId);
  }

  async getTotalByMonth(year?: number, month?: number) {
    return this.incomesRepository.getTotalByMonth(year, month);
  }
}
