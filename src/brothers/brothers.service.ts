import { Injectable, NotFoundException } from '@nestjs/common';
import { BrothersRepository } from './brothers.repository';
import { Brother, NewBrother } from './entities/brother.entity';

@Injectable()
export class BrothersService {
  constructor(private readonly brothersRepository: BrothersRepository) {}

  async findAll(): Promise<Brother[]> {
    return this.brothersRepository.findAll();
  }

  async findById(id: number): Promise<Brother> {
    const brother = await this.brothersRepository.findById(id);
    if (!brother) {
      throw new NotFoundException(`Brother with id ${id} not found`);
    }
    return brother;
  }

  async findByIds(ids: number[]): Promise<Brother[]> {
    return this.brothersRepository.findByIds(ids);
  }

  async create(data: NewBrother): Promise<Brother> {
    // Validate percentage is valid
    if (data.percentage <= 0 || data.percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Check if total percentage would exceed 100
    const currentBrothers = await this.brothersRepository.findAll();
    const currentTotal = currentBrothers.reduce((sum, b) => sum + b.percentage, 0);
    const newTotal = currentTotal + data.percentage;

    if (newTotal > 100) {
      throw new Error(
        `Total percentage cannot exceed 100%. Current: ${currentTotal}%, New: ${newTotal}%`,
      );
    }

    return this.brothersRepository.create(data);
  }

  async update(
    id: number,
    data: Partial<Omit<NewBrother, 'email'> & { email?: string }>,
  ): Promise<Brother> {
    if (data.percentage !== undefined) {
      if (data.percentage <= 0 || data.percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
      }

      // Check if total percentage would exceed 100
      const currentBrothers = await this.brothersRepository.findAll();
      const currentTotal = currentBrothers
        .filter(b => b.id !== id)
        .reduce((sum, b) => sum + b.percentage, 0);
      const newTotal = currentTotal + data.percentage;

      if (newTotal > 100) {
        throw new Error(
          `Total percentage cannot exceed 100%. Current (without this brother): ${currentTotal}%, New total: ${newTotal}%`,
        );
      }
    }

    return this.brothersRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const brother = await this.brothersRepository.findById(id);
    if (!brother) {
      throw new NotFoundException(`Brother with id ${id} not found`);
    }

    await this.brothersRepository.delete(id);
  }

  async getWithContributions() {
    return this.brothersRepository.findWithContributions();
  }

  async getTotalCount(): Promise<number> {
    return this.brothersRepository.getTotalCount();
  }
}
