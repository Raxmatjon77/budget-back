import { Injectable } from '@nestjs/common';
import { BalanceRepository } from './balance.repository';
import { SharedBalance } from './entities/balance.entity';
import { BalanceResponse } from '../common/interfaces/transaction-response.interface';

@Injectable()
export class BalanceService {
  constructor(private readonly balanceRepository: BalanceRepository) {}

  /**
   * Get the current shared balance
   */
  async getCurrentBalance(): Promise<BalanceResponse> {
    const balance = await this.balanceRepository.getBalance();

    return {
      balanceCents: balance.balanceCents,
      formatted: balance.getFormatted(),
      lastUpdated: balance.lastUpdated,
    };
  }

  /**
   * Check if balance is sufficient for a given amount
   */
  async isSufficient(amountCents: number): Promise<boolean> {
    return this.balanceRepository.isSufficient(amountCents);
  }
}
