import { IsNumber, IsString, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1) // At least 1 cent
  brotherId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amountCents: number;

  @IsString()
  @IsOptional()
  description?: string;
}
