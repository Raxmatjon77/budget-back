import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { TransactionsRepository } from './transactions.repository';
import { TransactionWithDetails, TransactionType } from './entities/transaction.entity';
import { QueryTransactionsDto } from '../common/dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) { }

  /**
   * Get transaction history with filters
   */
  async findHistory(dto: QueryTransactionsDto): Promise<{
    transactions: TransactionWithDetails[];
    total: number;
  }> {
    const transactions = await this.transactionsRepository.findHistory({
      limit: dto.limit,
      offset: dto.offset,
      type: dto.type === 'all' ? undefined : (dto.type as TransactionType),
      brotherId: dto.brotherId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    // Get total count
    const total = await this.transactionsRepository.count();

    return {
      transactions,
      total,
    };
  }

  /**
   * Export transactions to Excel
   */
  async exportToExcel(dto: QueryTransactionsDto, res: Response) {
    // Fetch all matching transactions (no limit)
    const transactions = await this.transactionsRepository.findHistory({
      limit: 100000,
      offset: 0,
      type: dto.type === 'all' ? undefined : (dto.type as TransactionType),
      brotherId: dto.brotherId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Brother / Creator', key: 'brother', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Balance After', key: 'balance', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add rows
    transactions.forEach(tx => {
      const row = worksheet.addRow({
        date: tx.createdAt,
        type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
        description: tx.description || '-',
        brother: tx.brotherName || tx.brotherId || '-',
        amount: tx.amountCents / 100,
        balance: tx.balanceAfterCents / 100,
      });

      // Style amount cell based on type
      const amountCell = row.getCell('amount');
      amountCell.numFmt = '#,##0.00';
      if (tx.type === 'income') {
        amountCell.font = { color: { argb: 'FF166534' } }; // Green
      } else {
        amountCell.font = { color: { argb: 'FFDC2626' } }; // Red
      }

      // Format balance cell
      row.getCell('balance').numFmt = '#,##0.00';
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.xlsx',
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Get balance history over time
   */
  async getBalanceHistory(limit: number = 30) {
    return this.transactionsRepository.getBalanceHistory(limit);
  }
}
