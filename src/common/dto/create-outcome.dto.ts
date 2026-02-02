import { IsNumber, IsString, IsNotEmpty, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OutcomeSplitDto } from './outcome-split.dto';

export { OutcomeSplitDto } from './outcome-split.dto';

export class CreateOutcomeDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1) // At least 1 cent
  totalAmountCents: number;

  @IsNumber()
  @IsNotEmpty()
  createdBy: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutcomeSplitDto)
  splits: OutcomeSplitDto[];
}
