import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KnexModule } from './common/database/knex.module';
import { BrothersModule } from './brothers/brothers.module';
import { IncomesModule } from './incomes/incomes.module';
import { OutcomesModule } from './outcomes/outcomes.module';
import { BalanceModule } from './balance/balance.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    KnexModule,
    BrothersModule,
    IncomesModule,
    OutcomesModule,
    BalanceModule,
    TransactionsModule,
    StatisticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
