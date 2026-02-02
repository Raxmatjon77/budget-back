import { Module } from '@nestjs/common';
import { BrothersService } from './brothers.service';
import { BrothersController } from './brothers.controller';
import { BrothersRepository } from './brothers.repository';

@Module({
  controllers: [BrothersController],
  providers: [BrothersService, BrothersRepository],
  exports: [BrothersService, BrothersRepository],
})
export class BrothersModule {}
