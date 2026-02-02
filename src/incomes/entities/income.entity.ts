import { Brother } from '../../brothers/entities/brother.entity';

export class Income {
  id: number;
  brotherId: number;
  brother?: Brother;
  amountCents: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Income>) {
    Object.assign(this, partial);
  }
}

export type NewIncome = Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'brother'>;
