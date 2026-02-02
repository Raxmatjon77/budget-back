export class BrotherStatistics {
  brotherId: number;
  name: string;
  percentage: number;
  totalContributed: number;
  totalShareOfOutcomes: number;
  netContribution: number;
}

export class MonthlySummary {
  month: string;
  year: number;
  income: number;
  outcome: number;
  net: number;
}

export class LargestOutcome {
  id: number;
  description: string;
  amountCents: number;
  createdAt: Date;
}

export class Statistics {
  totalIncome: number;
  totalOutcome: number;
  currentBalance: number;
  perBrother: BrotherStatistics[];
  largestOutcome: LargestOutcome | null;
  monthlySummary: MonthlySummary[];
  outcomeCount: number;
  incomeCount: number;
}
