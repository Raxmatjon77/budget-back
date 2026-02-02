export class SharedBalance {
  id: number;
  balanceCents: number;
  lastUpdated: Date;

  constructor(partial: Partial<SharedBalance>) {
    Object.assign(this, partial);
  }

  // Utility method to get formatted balance
  getFormatted(): string {
    const dollars = this.balanceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(dollars);
  }

  // Utility to check if balance is sufficient
  isSufficient(amountCents: number): boolean {
    return this.balanceCents >= amountCents;
  }
}
