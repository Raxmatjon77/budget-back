import { Brother } from '../../brothers/entities/brother.entity';

export class OutcomeSplit {
  id: number;
  outcomeId: number;
  brotherId: number;
  brother?: Brother;
  percentage: number;
  amountCents: number;
  createdAt: Date;
}

export class Outcome {
  id: number;
  description: string;
  totalAmountCents: number;
  createdById: number;
  createdBy?: Brother;
  createdAt: Date;
  updatedAt: Date;
  splits?: OutcomeSplit[];

  constructor(partial: Partial<Outcome>) {
    Object.assign(this, partial);
  }
}

export type NewOutcome = Omit<Outcome, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'splits'>;
