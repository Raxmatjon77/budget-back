import { Module } from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { IncomesController } from './incomes.controller';
import { IncomesRepository } from './incomes.repository';
import { BalanceRepository } from '../balance/balance.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { BrothersModule } from '../brothers/brothers.module';

@Module({
  imports: [BrothersModule],
  controllers: [IncomesController],
  providers: [
    IncomesService,
    IncomesRepository,
    BalanceRepository,
    TransactionsRepository,
  ],
  exports: [IncomesService, IncomesRepository],
})
export class IncomesModule {}
