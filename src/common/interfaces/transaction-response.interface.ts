export interface TransactionResponse {
  id: number;
  type: 'income' | 'outcome';
  amountCents: number;
  balanceAfterCents: number;
  createdAt: Date;
  brother?: {
    id: number;
    name: string;
  };
  description?: string;
  splits?: OutcomeSplitResponse[];
}

export interface OutcomeSplitResponse {
  brotherId: number;
  brotherName: string;
  percentage: number;
  amountCents: number;
}

export interface IncomeResponse {
  id: number;
  brotherId: number;
  brotherName: string;
  amountCents: number;
  description: string | null;
  createdAt: Date;
}

export interface OutcomeResponse {
  id: number;
  description: string;
  totalAmountCents: number;
  createdBy: number;
  createdByName: string;
  createdAt: Date;
  splits: OutcomeSplitResponse[];
}

export interface BalanceResponse {
  balanceCents: number;
  formatted: string;
  lastUpdated: Date;
}

export interface BrotherStats {
  brotherId: number;
  name: string;
  percentage: number;
  totalContributed: number;
  totalShareOfOutcomes: number;
  netContribution: number;
}

export interface StatisticsResponse {
  totalIncome: number;
  totalOutcome: number;
  currentBalance: number;
  perBrother: BrotherStats[];
  largestOutcome: {
    id: number;
    description: string;
    amountCents: number;
    createdAt: Date;
  } | null;
  monthlySummary: {
    month: string;
    income: number;
    outcome: number;
    net: number;
  }[];
  outcomeCount: number;
  incomeCount: number;
}
