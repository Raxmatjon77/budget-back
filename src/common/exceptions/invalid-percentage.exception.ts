import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidPercentageException extends HttpException {
  constructor(actualSum?: number) {
    super(
      {
        error: 'INVALID_PERCENTAGE',
        message: 'Outcome split percentages must sum to exactly 100%',
        details: {
          actualSum,
          expectedSum: 100,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
