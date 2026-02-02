import { Controller, Get } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { BalanceResponse } from '../common/interfaces/transaction-response.interface';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  async getBalance(): Promise<BalanceResponse> {
    return this.balanceService.getCurrentBalance();
  }
}
