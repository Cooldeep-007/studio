export type UserRole = 'SuperAdmin' | 'FirmAdmin' | 'Staff' | 'ClientUser';

export type User = {
  userId: string;
  firmId: string;
  role: UserRole;
  name: string;
  email: string;
  avatarUrl?: string;
};

export type Firm = {
  firmId: string;
  firmName: string;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise';
  subscriptionExpiry: Date;
  isActive: boolean;
};

export type Company = {
  id: string;
  companyName: string;
  gstin?: string;
  address?: string;
  financialYearStart: Date;
  financialYearEnd: Date;
  firmId: string;
};

export type LedgerGroup = 'Assets' | 'Liabilities' | 'Income' | 'Expense' | 'Sundry Debtor' | 'Sundry Creditor' | 'Bank Accounts';
export type BalanceType = 'Dr' | 'Cr';

export type Ledger = {
  id: string;
  ledgerName: string;
  parentLedgerId?: string;
  group: LedgerGroup;
  openingBalance: number;
  currentBalance: number;
  balanceType: BalanceType;
  isGroup: boolean;
  gstApplicable: boolean;
  gstDetails?: {
      gstType?: 'Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'SEZ' | 'Export';
      gstin?: string;
      gstRate?: number;
      hsnCode?: string;
      placeOfSupply?: string;
      reverseCharge?: boolean;
  };
  contactDetails?: {
    contactPerson?: string;
    mobileNumber?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    pan?: string;
  };
   bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    upiId?: string;
    micrCode?: string;
  };
  creditControl?: {
    creditLimit?: number;
    creditPeriod?: number; // in days
    billByBill?: boolean;
  };
  status: 'Active' | 'Inactive';
  ledgerCode?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  firmId: string;
  companyId: string;
};


export type VoucherType =
  | 'Sales'
  | 'Purchase'
  | 'Payment'
  | 'Receipt'
  | 'Journal'
  | 'Contra';

export type VoucherLineItem = {
  ledgerId: string;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
};

export type Voucher = {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: Date;
  partyLedger: string;
  lineItems: VoucherLineItem[];
  totalAmount: number;
  firmId: string;
  companyId: string;
  createdBy: string; // userId
};

export type InvoiceLineItem = {
    description: string;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
}

export type Invoice = {
    id: string;
    invoiceNumber: string;
    voucherId: string;
    companyId: string;
    firmId: string;
    date: Date;
    dueDate: Date;
    party: {
        name: string;
        address: string;
    };
    lineItems: InvoiceLineItem[];
    subTotal: number;
    totalTax: number;
    totalAmount: number;
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    template: {
        logoUrl?: string;
        colorTheme?: string;
        bankDetails?: string;
        footerNotes?: string;
        customFields?: Record<string, any>;
    }
}
