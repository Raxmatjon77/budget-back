import { Module } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { OutcomesController } from './outcomes.controller';
import { OutcomesRepository } from './outcomes.repository';
import { BalanceRepository } from '../balance/balance.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { BrothersModule } from '../brothers/brothers.module';

@Module({
  imports: [BrothersModule],
  controllers: [OutcomesController],
  providers: [
    OutcomesService,
    OutcomesRepository,
    BalanceRepository,
    TransactionsRepository,
  ],
  exports: [OutcomesService, OutcomesRepository],
})
export class OutcomesModule {}
