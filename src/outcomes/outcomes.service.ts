import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { OutcomesRepository, OutcomeWithDetails } from './outcomes.repository';
import { BalanceRepository } from '../balance/balance.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { BrothersRepository } from '../brothers/brothers.repository';
import { CreateOutcomeDto, OutcomeSplitDto } from '../common/dto/create-outcome.dto';
import { InvalidPercentageException } from '../common/exceptions/invalid-percentage.exception';
import { InsufficientBalanceException } from '../common/exceptions/insufficient-balance.exception';
import { Outcome } from './entities/outcome.entity';
import { CENTS_PER_DOLLAR } from '../common/constants';
import { KNEX_CONNECTION } from '../common/database/knex.module';
import { Knex } from 'knex';

@Injectable()
export class OutcomesService {
  constructor(
    private readonly outcomesRepository: OutcomesRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly brothersRepository: BrothersRepository,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  /**
   * Create a new outcome transaction with percentage-based cost splitting.
   * This is a critical operation that MUST be done within a database transaction
   * to ensure atomicity and prevent race conditions.
   *
   * Business Rules:
   * 1. Percentages must sum to exactly 100%
   * 2. Balance must be sufficient for the total amount
   * 3. Amounts are rounded to the nearest cent for each split
   * 4. Split amounts may not exactly sum to total due to rounding, so we adjust
   *
   * Steps:
   * 1. Validate percentage sum is exactly 100%
   * 2. Verify all brothers exist
   * 3. Start database transaction
   * 4. Lock the balance row (FOR UPDATE)
   * 5. Check if balance is sufficient
   * 6. Insert outcome record
   * 7. Calculate and insert splits
   * 8. Update balance (subtract amount)
   * 9. Log transaction in transaction_log
   * 10. Commit transaction
   *
   * @param dto - The outcome data with splits
   * @returns The created outcome record with splits
   */
  async create(dto: CreateOutcomeDto): Promise<OutcomeWithDetails> {
    // 1. Validate percentage sum is exactly 100%
    const totalPercentage = dto.splits.reduce(
      (sum, split) => sum + split.percentage,
      0,
    );

    // Allow small floating point errors but reject significant deviations
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new InvalidPercentageException(totalPercentage);
    }

    // 2. Verify all brothers exist
    const brotherIds = dto.splits.map(s => s.brotherId);
    const brothers = await this.brothersRepository.findByIds([
      dto.createdBy,
      ...brotherIds,
    ]);

    if (brothers.length !== new Set([dto.createdBy, ...brotherIds]).size) {
      throw new NotFoundException('One or more brothers not found');
    }

    // 3. Use a transaction for atomicity
    return this.knex.transaction(async (trx) => {
      // 4. Get and lock the balance (FOR UPDATE)
      const balance = await this.balanceRepository.getBalance(trx);

      // 5. Check if balance is sufficient
      if (!balance.isSufficient(dto.totalAmountCents)) {
        throw new InsufficientBalanceException(
          balance.balanceCents,
          dto.totalAmountCents,
        );
      }

      // 6. Insert outcome record
      const outcome = await this.outcomesRepository.create(trx, {
        description: dto.description,
        totalAmountCents: dto.totalAmountCents,
        createdById: dto.createdBy,
      });

      // 7. Calculate and insert splits
      // Handle rounding: calculate exact amounts and adjust to ensure total matches
      const splits = this.calculateSplits(
        dto.totalAmountCents,
        dto.splits,
      );

      await this.outcomesRepository.createSplits(trx, outcome.id, splits);

      // 8. Update balance (subtract amount)
      const balanceAfter = await this.balanceRepository.subtractBalance(
        trx,
        dto.totalAmountCents,
      );

      // 9. Log transaction
      await this.transactionsRepository.logTransaction(trx, {
        transactionType: 'outcome',
        referenceId: outcome.id,
        brotherId: dto.createdBy,
        amountCents: -dto.totalAmountCents, // Negative for outcome
        balanceAfterCents: balanceAfter.balanceCents,
      });

      // 10. Build and return response
      const brotherMap = new Map(brothers.map(b => [b.id, b]));

      return {
        id: outcome.id,
        description: outcome.description,
        totalAmountCents: outcome.totalAmountCents,
        createdById: outcome.createdById,
        createdByName: brotherMap.get(outcome.createdById)?.name || '',
        createdAt: outcome.createdAt,
        updatedAt: outcome.updatedAt,
        splits: splits.map(s => ({
          brotherId: s.brotherId,
          brotherName: brotherMap.get(s.brotherId)?.name || '',
          percentage: s.percentage,
          amountCents: s.amountCents,
        })),
      };
    });
  }

  /**
   * Calculate split amounts with proper rounding handling.
   *
   * Problem: When splitting amounts by percentage, rounding errors can cause
   * the sum of splits to not equal the total amount.
   *
   * Solution:
   * 1. Calculate exact amounts using floating point
   * 2. Round each amount to nearest cent
   * 3. Track the rounding error
   * 4. Adjust the last split to absorb any rounding difference
   *
   * Example: $100 split 45%, 35%, 20%
   * - Split 1: 45% of 10000 = 4500 (exact)
   * - Split 2: 35% of 10000 = 3500 (exact)
   * - Split 3: 20% of 10000 = 2000 (exact)
   * Total: 10000 ✓
   *
   * Example: $100.01 split 33.33%, 33.33%, 33.34%
   * - Split 1: 33.33% of 10001 = 3333.33 → 3333
   * - Split 2: 33.33% of 10001 = 3333.33 → 3333
   * - Split 3: 33.34% of 10001 = 3333.67 → 3334 (adjusted)
   * Total: 10000 (off by 1) → adjust split 3 to 3335
   * Final Total: 10001 ✓
   */
  private calculateSplits(
    totalAmountCents: number,
    splitsDto: OutcomeSplitDto[],
  ): Array<{ brotherId: number; percentage: number; amountCents: number }> {
    const result: Array<{
      brotherId: number;
      percentage: number;
      amountCents: number;
    }> = [];

    let totalAllocated = 0;

    // Calculate all splits except the last one
    for (let i = 0; i < splitsDto.length - 1; i++) {
      const split = splitsDto[i];
      const exactAmount = (totalAmountCents * split.percentage) / 100;
      const roundedAmount = Math.round(exactAmount);

      result.push({
        brotherId: split.brotherId,
        percentage: split.percentage,
        amountCents: roundedAmount,
      });

      totalAllocated += roundedAmount;
    }

    // The last split gets whatever remains to ensure total matches exactly
    const lastSplit = splitsDto[splitsDto.length - 1];
    const lastAmount = totalAmountCents - totalAllocated;

    result.push({
      brotherId: lastSplit.brotherId,
      percentage: lastSplit.percentage,
      amountCents: lastAmount, // May be off by 1 cent from pure percentage calculation
    });

    return result;
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<OutcomeWithDetails[]> {
    return this.outcomesRepository.findAll(options);
  }

  async findById(id: number): Promise<OutcomeWithDetails> {
    const outcome = await this.outcomesRepository.findById(id);
    if (!outcome) {
      throw new NotFoundException(`Outcome with id ${id} not found`);
    }
    return outcome;
  }

  async getTotalAmount(): Promise<number> {
    return this.outcomesRepository.getTotalAmount();
  }

  async getTotalShareByBrother(brotherId: number): Promise<number> {
    return this.outcomesRepository.getTotalShareByBrother(brotherId);
  }

  async count(): Promise<number> {
    return this.outcomesRepository.count();
  }

  async findLargest() {
    return this.outcomesRepository.findLargest();
  }

  async getTotalByMonth(year?: number, month?: number) {
    return this.outcomesRepository.getTotalByMonth(year, month);
  }
}
