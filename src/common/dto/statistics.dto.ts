import { IsOptional, IsString, IsNumber } from 'class-validator';

export class GetStatisticsDto {
  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'year' | 'all';

  @IsOptional()
  @IsNumber()
  brotherId?: number;
}
