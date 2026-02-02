import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { CreateOutcomeDto } from '../common/dto/create-outcome.dto';
import { OutcomeResponse } from '../common/interfaces/transaction-response.interface';

@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOutcomeDto: CreateOutcomeDto): Promise<OutcomeResponse> {
    const outcome = await this.outcomesService.create(createOutcomeDto);

    return {
      id: outcome.id,
      description: outcome.description,
      totalAmountCents: outcome.totalAmountCents,
      createdBy: outcome.createdById,
      createdByName: outcome.createdByName,
      createdAt: outcome.createdAt,
      splits: outcome.splits.map(s => ({
        brotherId: s.brotherId,
        brotherName: s.brotherName,
        percentage: s.percentage,
        amountCents: s.amountCents,
      })),
    };
  }

  @Get()
  async findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.outcomesService.findAll({
      limit,
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    const [total, count, largest] = await Promise.all([
      this.outcomesService.getTotalAmount(),
      this.outcomesService.count(),
      this.outcomesService.findLargest(),
    ]);

    return {
      totalAmountCents: total,
      count,
      largestOutcome: largest
        ? {
            id: largest.id,
            description: largest.description,
            amountCents: largest.totalAmountCents,
          }
        : null,
    };
  }

  @Get('largest')
  async getLargest() {
    return this.outcomesService.findLargest();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outcomesService.findById(id);
  }
}
