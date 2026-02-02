import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto, TransactionType } from '../common/dto/query-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Get()
  async findAll(@Query() query: QueryTransactionsDto) {
    const dto: QueryTransactionsDto = {
      type: (query.type as TransactionType) || TransactionType.ALL,
      limit: query.limit || 50,
      offset: query.offset || 0,
      brotherId: query.brotherId,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return this.transactionsService.findHistory(dto);
  }

  @Get('export')
  async exportToExcel(
    @Query() query: QueryTransactionsDto,
    @Res() res: Response,
  ) {
    const dto: QueryTransactionsDto = {
      type: (query.type as TransactionType) || TransactionType.ALL,
      brotherId: query.brotherId,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return this.transactionsService.exportToExcel(dto, res);
  }

  @Get('balance-history')
  async getBalanceHistory(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.transactionsService.getBalanceHistory(limit);
  }
}
