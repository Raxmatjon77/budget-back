import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from '../common/dto/create-income.dto';
import { IncomeResponse } from '../common/interfaces/transaction-response.interface';

@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createIncomeDto: CreateIncomeDto): Promise<IncomeResponse> {
    const income = await this.incomesService.create(createIncomeDto);

    // Get brother name for response
    const brother = await this.incomesService['brothersRepository'].findById(income.brotherId);

    return {
      id: income.id,
      brotherId: income.brotherId,
      brotherName: brother?.name || '',
      amountCents: income.amountCents,
      description: income.description || null,
      createdAt: income.createdAt,
    };
  }

  @Get()
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('brotherId', new ParseIntPipe({ optional: true })) brotherId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.incomesService.findAll({
      limit,
      offset,
      brotherId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    const [total, count] = await Promise.all([
      this.incomesService.getTotalAmount(),
      this.incomesService.count(),
    ]);

    return {
      totalAmountCents: total,
      count,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incomesService.findById(id);
  }
}
