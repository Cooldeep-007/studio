import type { Company, Ledger, User, Voucher, Invoice } from './types';

export const mockUser: User = {
  userId: 'user-123',
  firmId: 'firm-abc',
  role: 'FirmAdmin',
  name: 'Admin User',
  email: 'admin@example.com',
};

export const mockCompanies: Company[] = [
  {
    id: 'comp-001',
    companyName: 'Innovate Inc.',
    gstin: '29AABCU9511F1Z5',
    address: '123 Tech Park, Bangalore, KA',
    financialYearStart: new Date('2023-04-01'),
    financialYearEnd: new Date('2024-03-31'),
    firmId: 'firm-abc',
  },
  {
    id: 'comp-002',
    companyName: 'Synergy Solutions',
    gstin: '27AAGCB9812G1Z2',
    address: '456 Business Hub, Mumbai, MH',
    financialYearStart: new Date('2023-04-01'),
    financialYearEnd: new Date('2024-03-31'),
    firmId: 'firm-abc',
  },
];

export const mockLedgers: Ledger[] = [
  {
    id: 'led-01',
    ledgerName: 'Sales Account',
    group: 'Income',
    openingBalance: 0,
    balanceType: 'Cr',
    gstApplicable: true,
    gstRate: 18,
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-02',
    ledgerName: 'HDFC Bank',
    group: 'Assets',
    openingBalance: 500000,
    balanceType: 'Dr',
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
  {
    id: 'led-03',
    ledgerName: 'Office Rent',
    group: 'Expense',
    openingBalance: 0,
    balanceType: 'Dr',
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
    {
    id: 'led-04',
    ledgerName: 'Client A',
    group: 'Assets', // Sundry Debtors are assets
    openingBalance: 15000,
    balanceType: 'Dr',
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
    {
    id: 'led-05',
    ledgerName: 'Supplier B',
    group: 'Liabilities', // Sundry Creditors are liabilities
    openingBalance: 25000,
    balanceType: 'Cr',
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
   {
    id: 'led-06',
    ledgerName: 'Capital Account',
    group: 'Liabilities',
    openingBalance: 1000000,
    balanceType: 'Cr',
    firmId: 'firm-abc',
    companyId: 'comp-001',
  },
];

export const mockVouchers: Voucher[] = [
  {
    id: 'vch-001',
    voucherNumber: 'SALE-001',
    voucherType: 'Sales',
    date: new Date('2023-10-25'),
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
    date: new Date('2023-10-26'),
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
    date: new Date('2023-10-27'),
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
    date: new Date('2023-11-01'),
    partyLedger: 'led-05', // Supplier B
    lineItems: [
      { ledgerId: 'led-inventory', amount: 20000, taxRate: 12, taxAmount: 2400 },
    ],
    totalAmount: 22400,
    firmId: 'firm-abc',
    companyId: 'comp-001',
    createdBy: 'user-123',
  },
];

export const mockInvoices: Invoice[] = [
    {
        id: "inv-001",
        invoiceNumber: "INV-2023-001",
        voucherId: "vch-001",
        companyId: "comp-001",
        firmId: "firm-abc",
        date: new Date("2023-10-25"),
        dueDate: new Date("2023-11-24"),
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
