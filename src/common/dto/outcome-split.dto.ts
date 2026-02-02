import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

export class OutcomeSplitDto {
  @IsNumber()
  @IsNotEmpty()
  brotherId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  @Max(100)
  percentage: number;
}
