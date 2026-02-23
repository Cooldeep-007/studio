

export type UserRole = 'Owner' | 'Admin' | 'Accountant' | 'Staff';

export type UserProfile = {
  uid: string;
  firmId: string;
  role: UserRole;
  name: string;
  email: string;
  avatarUrl?: string;
  companyName: string;
  mobile: string;
  createdAt: any; // Firestore ServerTimestamp
  firstLogin?: boolean;
  welcomeTimestamp?: any; // Firestore ServerTimestamp
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
  status: 'Active' | 'Archived';
};

export type LedgerGroup =
  | 'Assets'
  | 'Liabilities'
  | 'Income'
  | 'Expense'
  | 'Sundry Debtor'
  | 'Sundry Creditor'
  | 'Bank Accounts';
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
    uqc?: string;
    placeOfSupply?: string;
    reverseCharge?: boolean;
    itcEligibility?: 'Eligible' | 'Ineligible' | 'As per Rules';
    gstClassification?: 'Goods' | 'Services';
    eInvoiceRequired?: boolean;
    eWayBillApplicable?: boolean;
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
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
    accountType?: 'Savings' | 'Current' | 'OD';
    micrCode?: string;
    upiId?: string;
  };
  creditControl?: {
    creditLimit?: number;
    creditPeriod?: number; // in days
    billByBill?: boolean;
    interestRate?: number;
    gracePeriod?: number;
    riskCategory?: 'Low' | 'Medium' | 'High';
    autoBlockOverdue?: boolean;
  };
  tdsTcsConfig?: {
    tdsEnabled?: boolean;
    tdsNatureOfPayment?: string;
    tdsSection?: string;
    tdsRate?: number;
    deductorType?: string;
    tcsEnabled?: boolean;
    tcsNature?: string;
    tcsRate?: number;
    tdsDeducteeType?: 'individual' | 'other';
  };
  costCenterConfig?: {
    enabled?: boolean;
    defaultCostCenter?: string;
  };
  automationRules?: {
    defaultVoucherType?: VoucherType;
    autoRoundOff?: boolean;
    defaultNarration?: string;
    autoReminder?: boolean;
  };
  complianceConfig?: {
    auditRequired?: boolean;
    lockAfterDate?: Date;
    approvalRequired?: boolean;
    enableAuditTrail?: boolean;
  };
  customFields?: Record<string, any>;
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
  | 'Contra'
  | 'Debit Note'
  | 'Credit Note';

export type VoucherLineItem = {
  ledgerId: string;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  type?: 'Dr' | 'Cr';
};

export type Voucher = {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: Date;
  createdAt: Date;
  partyLedger: string;
  lineItems: VoucherLineItem[];
  totalAmount: number;
  firmId: string;
  companyId: string;
  createdBy: string; // userId
};

export type Note = {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  createdAt: Date;
  reminderDate?: Date;
  attachmentUrl?: string;
};

export type Item = {
  id: string;
  name: string;
  type: 'Goods' | 'Services';
  hsnCode?: string;
  sacCode?: string;
  unitPrice: number;
  uqc?: string;
  gstRate: number;
  salesLedgerId: string;
  purchaseLedgerId: string;
};

  
