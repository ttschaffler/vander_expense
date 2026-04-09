import { NextRequest, NextResponse } from 'next/server';
import { FinTSClient, FinTSConfig } from 'lib-fints';
import type { BankTransaction, StatementsResponse } from '@/types/bank';

interface RequestBody {
  bankingInfo: string;
  userId: string;
  pin: string;
  productId: string;
  tanMethodId: number;
  accountNumber: string;
  from?: string;
  to?: string;
  tanReference?: string;
  tan?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { bankingInfo, userId, pin, productId, tanMethodId, accountNumber, from, to, tanReference, tan } = body;

    if (!bankingInfo || !userId || !pin || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } satisfies StatementsResponse,
        { status: 400 }
      );
    }

    const parsed = JSON.parse(bankingInfo, (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    });

    const config = FinTSConfig.fromBankingInformation(
      productId || '0',
      '1.0.0',
      parsed,
      userId,
      pin,
      tanMethodId
    );

    const client = new FinTSClient(config);

    // Continue with TAN if provided
    if (tanReference) {
      const response = await client.getAccountStatementsWithTan(tanReference, tan);
      if (!response.success) {
        const errorMsg = response.bankAnswers
          ?.map((a) => a.text)
          .filter(Boolean)
          .join('; ') || 'Statement fetch with TAN failed';
        return NextResponse.json({ success: false, error: errorMsg } satisfies StatementsResponse);
      }

      const transactions = extractTransactions(response.statements);
      return NextResponse.json({
        success: true,
        transactions,
      } satisfies StatementsResponse);
    }

    // Fetch statements
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const response = await client.getAccountStatements(accountNumber, fromDate, toDate);

    if (!response.success) {
      const errorMsg = response.bankAnswers
        ?.map((a) => a.text)
        .filter(Boolean)
        .join('; ') || 'Failed to fetch statements';
      return NextResponse.json({ success: false, error: errorMsg } satisfies StatementsResponse);
    }

    if (response.requiresTan) {
      return NextResponse.json({
        success: true,
        tanRequired: true,
        tanChallenge: response.tanChallenge || 'Please enter your TAN to view statements',
        tanReference: response.tanReference,
      } satisfies StatementsResponse);
    }

    const transactions = extractTransactions(response.statements);
    const lastStatement = response.statements?.[response.statements.length - 1];
    const balance = lastStatement?.closingBalance
      ? {
          value: lastStatement.closingBalance.value,
          currency: lastStatement.closingBalance.currency,
          date: lastStatement.closingBalance.date?.toISOString().split('T')[0] || '',
        }
      : undefined;

    return NextResponse.json({
      success: true,
      transactions,
      balance,
    } satisfies StatementsResponse);
  } catch (error) {
    console.error('Statement fetch error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch statements';
    return NextResponse.json(
      { success: false, error: message } satisfies StatementsResponse,
      { status: 500 }
    );
  }
}

interface RawTransaction {
  valueDate?: Date;
  entryDate?: Date;
  amount?: number;
  purpose?: string;
  remoteName?: string;
  bookingText?: string;
  e2eReference?: string;
}

interface RawStatement {
  transactions?: RawTransaction[];
  closingBalance?: {
    currency?: string;
  };
}

function extractTransactions(statements: RawStatement[] | undefined): BankTransaction[] {
  if (!statements) return [];

  const transactions: BankTransaction[] = [];
  for (const statement of statements) {
    if (!statement.transactions) continue;
    for (const tx of statement.transactions) {
      transactions.push({
        date: tx.valueDate?.toISOString().split('T')[0] || tx.entryDate?.toISOString().split('T')[0] || '',
        amount: tx.amount || 0,
        currency: statement.closingBalance?.currency || 'EUR',
        purpose: tx.purpose || '',
        remoteName: tx.remoteName || '',
        bookingText: tx.bookingText || '',
        e2eReference: tx.e2eReference,
      });
    }
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}
