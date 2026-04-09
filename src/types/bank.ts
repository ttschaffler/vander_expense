export interface BankCredentials {
  bankUrl: string;
  bankId: string; // BLZ
  userId: string;
  pin: string;
  productId: string;
}

export interface BankAccount {
  accountNumber: string;
  iban?: string;
  accountName?: string;
  accountType?: string;
}

export interface BankTransaction {
  date: string;
  amount: number;
  currency: string;
  purpose: string;
  remoteName: string;
  bookingText: string;
  e2eReference?: string;
}

export interface ConnectResponse {
  success: boolean;
  error?: string;
  tanRequired?: boolean;
  tanChallenge?: string;
  tanReference?: string;
  tanMethods?: { id: number; name: string }[];
  accounts?: BankAccount[];
  bankingInfo?: string; // serialized for session reuse
}

export interface StatementsResponse {
  success: boolean;
  error?: string;
  tanRequired?: boolean;
  tanChallenge?: string;
  tanReference?: string;
  transactions?: BankTransaction[];
  balance?: { value: number; currency: string; date: string };
}

export const MLP_BANK_DEFAULTS = {
  bankId: '67230000',
  bankUrl: 'https://fints2.atruvia.de/cgi-bin/hbciservlet',
  productId: '0',
};
