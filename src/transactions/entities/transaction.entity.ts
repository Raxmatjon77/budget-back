export type TransactionType = 'income' | 'outcome';

export class TransactionLog {
  id: number;
  transactionType: TransactionType;
  referenceId: number;
  brotherId?: number;
  amountCents: number;
  balanceAfterCents: number;
  createdAt: Date;
}

export class Transaction {
  id: number;
  type: TransactionType;
  amountCents: number;
  balanceAfterCents: number;
  createdAt: Date;
  brotherId?: number;
  brotherName?: string;
  description?: string;
  splits?: Array<{
    brotherId: number;
    brotherName: string;
    percentage: number;
    amountCents: number;
  }>;
}

export interface TransactionWithDetails extends Transaction {
  type: TransactionType;
}
