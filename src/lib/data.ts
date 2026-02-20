import type { Company, Ledger, User, Voucher, Invoice } from './types';

export const mockUser: User = {
  userId: 'user-123',
  firmId: 'firm-abc',
  role: 'FirmAdmin',
  name: 'Admin User',
  email: 'admin@example.com',
};

// Use a fixed year for mock data to avoid hydration issues between server and client rendering
const MOCK_DATA_YEAR = 2023;

const financialYearStart = new Date(MOCK_DATA_YEAR, 3, 1); // April 1, 2023
const financialYearEnd = new Date(MOCK_DATA_YEAR + 1, 2, 31); // March 31, 2024


export const mockCompanies: Company[] = [
  {
    id: 'comp-001',
    companyName: 'Innovate Inc.',
    gstin: '29AABCU9511F1Z5',
    address: '123 Tech Park, Bangalore, KA',
    financialYearStart: financialYearStart,
    financialYearEnd: financialYearEnd,
    firmId: 'firm-abc',
    status: 'Active',
  },
  {
    id: 'comp-002',
    companyName: 'Synergy Solutions',
    gstin: '27AAGCB9812G1Z2',
    address: '456 Business Hub, Mumbai, MH',
    financialYearStart: financialYearStart,
    financialYearEnd: financialYearEnd,
    firmId: 'firm-abc',
    status: 'Archived',
  },
];

export const mockLedgers: Ledger[] = [
  // =================================================================
  // PARENT GROUPS (STANDARD ACCOUNTING HIERARCHY)
  // =================================================================
  
  // Primary Groups (No Parent)
  {
    id: 'group-assets',
    ledgerName: 'Assets',
    group: 'Assets',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-liabilities',
    ledgerName: 'Liabilities',
    group: 'Liabilities',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-income',
    ledgerName: 'Income',
    group: 'Income',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-expense',
    ledgerName: 'Expenses',
    group: 'Expense',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },

  // Sub-Groups under Assets
  {
    id: 'group-current-assets',
    ledgerName: 'Current Assets',
    parentLedgerId: 'group-assets',
    group: 'Assets',
    isGroup: true, openingBalance: 0, currentBalance: 615000, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-bank-accounts',
    ledgerName: 'Bank Accounts',
    parentLedgerId: 'group-current-assets',
    group: 'Bank Accounts',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
   {
    id: 'group-sundry-debtors',
    ledgerName: 'Sundry Debtors',
    parentLedgerId: 'group-current-assets',
    group: 'Sundry Debtor',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },

  // Sub-Groups under Liabilities
   {
    id: 'group-capital-account',
    ledgerName: 'Capital Account',
    parentLedgerId: 'group-liabilities',
    group: 'Liabilities',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-current-liabilities',
    ledgerName: 'Current Liabilities',
    parentLedgerId: 'group-liabilities',
    group: 'Liabilities',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-sundry-creditors',
    ledgerName: 'Sundry Creditors',
    parentLedgerId: 'group-current-liabilities',
    group: 'Sundry Creditor',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-duties-taxes',
    ledgerName: 'Duties & Taxes',
    parentLedgerId: 'group-current-liabilities',
    group: 'Liabilities',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
   {
    id: 'group-tds-payable',
    ledgerName: 'TDS Payable',
    parentLedgerId: 'group-duties-taxes',
    group: 'Liabilities',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },

  // Sub-Groups under Income
  {
    id: 'group-sales-accounts',
    ledgerName: 'Sales Accounts',
    parentLedgerId: 'group-income',
    group: 'Income',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-indirect-income',
    ledgerName: 'Indirect Incomes',
    parentLedgerId: 'group-income',
    group: 'Income',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },

  // Sub-Groups under Expense
  {
    id: 'group-purchase-accounts',
    ledgerName: 'Purchase Accounts',
    parentLedgerId: 'group-expense',
    group: 'Expense',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'group-indirect-expenses',
    ledgerName: 'Indirect Expenses',
    parentLedgerId: 'group-expense',
    group: 'Expense',
    isGroup: true, openingBalance: 0, currentBalance: 0, balanceType: 'Dr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },

  // =================================================================
  // CHILD LEDGERS (TRANSACTIONAL LEDGERS)
  // =================================================================
  {
    id: 'led-cash',
    ledgerName: 'Cash in Hand',
    parentLedgerId: 'group-current-assets',
    group: 'Assets',
    isGroup: false,
    openingBalance: 50000,
    currentBalance: 50000,
    balanceType: 'Dr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-02',
    ledgerName: 'HDFC Bank',
    parentLedgerId: 'group-bank-accounts',
    group: 'Bank Accounts',
    isGroup: false,
    openingBalance: 500000,
    currentBalance: 480000, // 500k - 25k payment + 5k receipt
    balanceType: 'Dr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 9, 27),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-04',
    ledgerName: 'Client A',
    parentLedgerId: 'group-sundry-debtors',
    group: 'Sundry Debtor',
    isGroup: false,
    openingBalance: 15000,
    currentBalance: 21800, // 15k + 11.8k sale - 5k receipt
    balanceType: 'Dr',
    gstApplicable: true,
    gstDetails: {
      gstRate: 18,
      gstin: '29AABCC1234F1Z5',
      gstClassification: 'Services',
    },
    status: 'Active',
    contactDetails: {
        contactPerson: 'Anil Kumar',
        mobileNumber: '9876543210',
        email: 'anil@clienta.com',
        addressLine1: '789 Client Avenue',
        city: 'Bangalore',
        state: 'Karnataka',
        pan: 'AABCC1234F'
    },
    creditControl: {
        creditLimit: 50000,
        creditPeriod: 30,
    },
    createdAt: new Date(MOCK_DATA_YEAR, 4, 10),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 9, 27),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-05',
    ledgerName: 'Supplier B',
    parentLedgerId: 'group-sundry-creditors',
    group: 'Sundry Creditor',
    isGroup: false,
    openingBalance: 25000,
    currentBalance: 47400, // 25k + 22.4k purchase
    balanceType: 'Cr',
    gstApplicable: true,
    gstDetails: {
        gstRate: 12,
        gstClassification: 'Goods',
    },
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 5, 15),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 10, 1),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
   {
    id: 'led-06',
    ledgerName: 'Share Capital',
    parentLedgerId: 'group-capital-account',
    group: 'Liabilities',
    isGroup: false,
    openingBalance: 1000000,
    currentBalance: 1000000,
    balanceType: 'Cr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-01',
    ledgerName: 'Domestic Sales',
    parentLedgerId: 'group-sales-accounts',
    group: 'Income',
    isGroup: false,
    openingBalance: 0,
    currentBalance: 10000,
    balanceType: 'Cr',
    gstApplicable: true,
    gstDetails: {
        gstRate: 18,
        gstClassification: 'Goods',
    },
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 9, 25),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-03',
    ledgerName: 'Office Rent',
    parentLedgerId: 'group-indirect-expenses',
    group: 'Expense',
    isGroup: false,
    openingBalance: 0,
    currentBalance: 25000,
    balanceType: 'Dr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 9, 26),
    firmId: 'firm-abc',
    companyId: 'comp-001',
    tdsTcsConfig: { tdsEnabled: true, tdsNatureOfPayment: 'rent_land', tdsSection: '194I', tdsRate: 10 },
  },
  {
    id: 'led-salaries',
    ledgerName: 'Salaries & Wages',
    parentLedgerId: 'group-indirect-expenses',
    group: 'Expense',
    isGroup: false,
    openingBalance: 0,
    currentBalance: 75000,
    balanceType: 'Dr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 10, 5),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-marketing',
    ledgerName: 'Marketing Expenses',
    parentLedgerId: 'group-indirect-expenses',
    group: 'Expense',
    isGroup: false,
    openingBalance: 0,
    currentBalance: 12000,
    balanceType: 'Dr',
    gstApplicable: true,
    gstDetails: { gstRate: 5, gstClassification: 'Services' },
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 10, 10),
    firmId: 'firm-abc',
    companyId: 'comp-001',
    tdsTcsConfig: { tdsEnabled: true, tdsNatureOfPayment: 'professional', tdsSection: '194J', tdsRate: 10 },
  },
  {
    id: 'led-utilities',
    ledgerName: 'Utilities',
    parentLedgerId: 'group-indirect-expenses',
    group: 'Expense',
    isGroup: false,
    openingBalance: 0,
    currentBalance: 8000,
    balanceType: 'Dr',
    gstApplicable: false,
    status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1),
    lastUpdatedAt: new Date(MOCK_DATA_YEAR, 10, 12),
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-cgst',
    ledgerName: 'CGST',
    parentLedgerId: 'group-duties-taxes',
    group: 'Liabilities',
    isGroup: false, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'led-sgst',
    ledgerName: 'SGST',
    parentLedgerId: 'group-duties-taxes',
    group: 'Liabilities',
    isGroup: false, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
  {
    id: 'led-igst',
    ledgerName: 'IGST',
    parentLedgerId: 'group-duties-taxes',
    group: 'Liabilities',
    isGroup: false, openingBalance: 0, currentBalance: 0, balanceType: 'Cr', gstApplicable: false, status: 'Active',
    createdAt: new Date(MOCK_DATA_YEAR, 3, 1), lastUpdatedAt: new Date(MOCK_DATA_YEAR, 3, 1), firmId: 'firm-abc', companyId: 'comp-001',
  },
];


export const mockVouchers: Voucher[] = [
  {
    id: 'vch-001',
    voucherNumber: 'SALE-001',
    voucherType: 'Sales',
    date: new Date(MOCK_DATA_YEAR, 9, 25),
    partyLedger: 'led-04', // Client A
    lineItems: [
      { ledgerId: 'led-01', amount: 10000, taxRate: 18, taxAmount: 1800 },
    ],
    totalAmount: 11800,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  },
  {
    id: 'vch-002',
    voucherNumber: 'PAY-001',
    voucherType: 'Payment',
    date: new Date(MOCK_DATA_YEAR, 9, 26),
    partyLedger: 'led-03', // Office Rent
    lineItems: [{ ledgerId: 'led-02', amount: 25000 }], // Paid from HDFC
    totalAmount: 25000,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  },
  {
    id: 'vch-003',
    voucherNumber: 'RCPT-001',
    voucherType: 'Receipt',
    date: new Date(MOCK_DATA_YEAR, 9, 27),
    partyLedger: 'led-04', // Client A
    lineItems: [{ ledgerId: 'led-02', amount: 5000 }], // Received in HDFC
    totalAmount: 5000,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  },
    {
    id: 'vch-004',
    voucherNumber: 'PUR-001',
    voucherType: 'Purchase',
    date: new Date(MOCK_DATA_YEAR, 10, 1),
    partyLedger: 'led-05', // Supplier B
    lineItems: [
      { ledgerId: 'led-inventory', amount: 20000, taxRate: 12, taxAmount: 2400 },
    ],
    totalAmount: 22400,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  },
  {
    id: 'vch-005',
    voucherNumber: 'PAY-002',
    voucherType: 'Payment',
    date: new Date(MOCK_DATA_YEAR, 10, 10),
    partyLedger: 'led-marketing',
    lineItems: [{ ledgerId: 'led-02', amount: 12000 }],
    totalAmount: 12000,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  }
];

export const mockInvoices: Invoice[] = [
    {
        id: "inv-001",
        invoiceNumber: "INV-2023-001",
        voucherId: "vch-001",
        companyId: "comp-001",
        firmId: "firm-abc",
        date: new Date(MOCK_DATA_YEAR, 9, 25),
        dueDate: new Date(MOCK_DATA_YEAR, 10, 24),
        party: {
            name: "Client A",
            address: "789 Client Avenue, Bangalore, KA"
        },
        lineItems: [
            { description: "Software Development Services", amount: 10000, taxRate: 18, taxAmount: 1800, total: 11800 }
        ],
        subTotal: 10000,
        totalTax: 1800,
        totalAmount: 11800,
        status: "Paid",
        template: {
            logoUrl: "/logo-placeholder.svg",
            colorTheme: "#50C878",
            bankDetails: "Bank: HDFC Bank, A/C: 1234567890, IFSC: HDFC0001234",
            footerNotes: "Thank you for your business!"
        }
    }
]
