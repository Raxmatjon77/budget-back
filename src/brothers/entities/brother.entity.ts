export class Brother {
  id: number;
  name: string;
  email?: string;
  percentage: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Brother>) {
    Object.assign(this, partial);
  }
}

export type NewBrother = Omit<Brother, 'id' | 'createdAt' | 'updatedAt'>;
