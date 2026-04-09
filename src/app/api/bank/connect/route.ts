import { NextRequest, NextResponse } from 'next/server';
import { FinTSClient, FinTSConfig } from 'lib-fints';
import type { BankCredentials, ConnectResponse, BankAccount } from '@/types/bank';

export async function POST(request: NextRequest) {
  try {
    const body: BankCredentials & { tanMethodId?: number; tanReference?: string; tan?: string; bankingInfo?: string } =
      await request.json();

    const { bankUrl, bankId, userId, pin, productId, tanMethodId, tanReference, tan, bankingInfo } = body;

    if (!bankUrl || !bankId || !userId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } satisfies ConnectResponse,
        { status: 400 }
      );
    }

    let config: FinTSConfig;
    if (bankingInfo) {
      const parsed = JSON.parse(bankingInfo, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      });
      config = FinTSConfig.fromBankingInformation(
        productId || '0',
        '1.0.0',
        parsed,
        userId,
        pin,
        tanMethodId
      );
    } else {
      config = FinTSConfig.forFirstTimeUse(
        productId || '0',
        '1.0.0',
        bankUrl,
        bankId,
        userId,
        pin
      );
    }

    const client = new FinTSClient(config);

    // If continuing with TAN
    if (tanReference) {
      const response = await client.synchronizeWithTan(tanReference, tan);
      if (!response.success) {
        const errorMsg = response.bankAnswers
          ?.map((a) => a.text)
          .filter(Boolean)
          .join('; ') || 'Synchronization with TAN failed';
        return NextResponse.json({ success: false, error: errorMsg } satisfies ConnectResponse);
      }

      const accounts = extractAccounts(config);
      return NextResponse.json({
        success: true,
        accounts,
        bankingInfo: JSON.stringify(config.bankingInformation),
      } satisfies ConnectResponse);
    }

    // First sync to get BPD (bank parameter data)
    let syncResponse = await client.synchronize();

    if (!syncResponse.success) {
      const errorMsg = syncResponse.bankAnswers
        ?.map((a) => a.text)
        .filter(Boolean)
        .join('; ') || 'Initial synchronization failed';
      return NextResponse.json({ success: false, error: errorMsg } satisfies ConnectResponse);
    }

    // Get available TAN methods
    const tanMethods = config.availableTanMethods?.map((m: { id: number; name: string }) => ({
      id: m.id,
      name: m.name,
    })) || [];

    // Select TAN method and sync again for UPD (user data with accounts)
    if (tanMethods.length > 0) {
      const selectedMethod = tanMethodId || tanMethods[0].id;
      client.selectTanMethod(selectedMethod);
    }

    syncResponse = await client.synchronize();

    if (!syncResponse.success) {
      const errorMsg = syncResponse.bankAnswers
        ?.map((a) => a.text)
        .filter(Boolean)
        .join('; ') || 'Second synchronization failed';
      return NextResponse.json({ success: false, error: errorMsg } satisfies ConnectResponse);
    }

    if (syncResponse.requiresTan) {
      return NextResponse.json({
        success: true,
        tanRequired: true,
        tanChallenge: syncResponse.tanChallenge || 'Please enter your TAN',
        tanReference: syncResponse.tanReference,
        tanMethods,
        bankingInfo: JSON.stringify(config.bankingInformation),
      } satisfies ConnectResponse);
    }

    const accounts = extractAccounts(config);
    return NextResponse.json({
      success: true,
      accounts,
      tanMethods,
      bankingInfo: JSON.stringify(config.bankingInformation),
    } satisfies ConnectResponse);
  } catch (error) {
    console.error('Bank connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json(
      { success: false, error: message } satisfies ConnectResponse,
      { status: 500 }
    );
  }
}

function extractAccounts(config: FinTSConfig): BankAccount[] {
  const upd = config.bankingInformation?.upd;
  if (!upd?.bankAccounts) return [];

  return upd.bankAccounts.map(
    (acc: { accountNumber: string; iban?: string; accountName?: string; accountType?: string }) => ({
      accountNumber: acc.accountNumber,
      iban: acc.iban,
      accountName: acc.accountName || `Account ${acc.accountNumber}`,
      accountType: acc.accountType,
    })
  );
}
