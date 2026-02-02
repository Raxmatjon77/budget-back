import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientBalanceException extends HttpException {
  constructor(currentBalance?: number, requiredAmount?: number) {
    super(
      {
        error: 'INSUFFICIENT_BALANCE',
        message: 'Not enough balance in shared fund to complete this outcome',
        details: {
          currentBalance,
          requiredAmount,
          shortfall: requiredAmount && currentBalance ? requiredAmount - currentBalance : undefined,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
