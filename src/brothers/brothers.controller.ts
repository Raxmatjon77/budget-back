import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { BrothersService } from './brothers.service';
import { Brother } from './entities/brother.entity';
import { IsNumber, IsString, IsOptional, IsEmail, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class CreateBrotherDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  percentage: number;
}

class UpdateBrotherDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(100)
  percentage?: number;
}

@Controller('brothers')
export class BrothersController {
  constructor(private readonly brothersService: BrothersService) {}

  @Get()
  async findAll(): Promise<Brother[]> {
    return this.brothersService.findAll();
  }

  @Get('with-contributions')
  async getWithContributions() {
    return this.brothersService.getWithContributions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Brother> {
    return this.brothersService.findById(+id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBrotherDto: CreateBrotherDto): Promise<Brother> {
    return this.brothersService.create(createBrotherDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBrotherDto: UpdateBrotherDto,
  ): Promise<Brother> {
    return this.brothersService.update(+id, updateBrotherDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.brothersService.delete(+id);
  }
}
