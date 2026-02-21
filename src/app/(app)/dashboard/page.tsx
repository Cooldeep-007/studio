'use client';

import * as React from 'react';
import {
  DollarSign,
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  FileText,
  BadgePercent,
  CalendarCheck,
  FileWarning,
  Notebook,
  AlarmClock,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardChart } from '@/components/dashboard-chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  mockVouchers,
  mockLedgers,
  mockCompanies,
  mockNotes,
} from '@/lib/data';
import type { Voucher, Ledger } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function DashboardPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: new Date(2023, 11, 31),
  });

  // --- Data Filtering Logic ---
  const filteredVouchers = mockVouchers.filter((v) => {
    const voucherDate = new Date(v.date);
    if (!date?.from || !date?.to) return true;
    return voucherDate >= date.from && voucherDate <= date.to;
  });

  const ledgerMap = new Map(mockLedgers.map((l) => [l.id, l]));

  // --- Dynamic Data Calculation Logic ---
  const totalIncome = filteredVouchers
    .filter((v) => v.voucherType === 'Sales')
    .reduce(
      (acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0),
      0
    );

  const expenseLedgers = mockLedgers.filter(
    (l) => l.group === 'Expense' && !l.isGroup
  );
  const expenseLedgerIds = new Set(expenseLedgers.map((l) => l.id));
  const expenseLedgerMap = new Map(expenseLedgers.map((l) => [l.id, l]));

  // Refactored expense calculation to be pure
  const calculateExpenses = (vouchers: Voucher[]) => {
    const allExpenses = [
      // Purchases
      ...vouchers
        .filter((v) => v.voucherType === 'Purchase')
        .map((v) => ({
          name: 'Purchases',
          amount: v.lineItems.reduce((acc, item) => acc + item.amount, 0),
        })),
      // Other Expenses from Payment/Journal line items
      ...vouchers
        .filter((v) => ['Payment', 'Journal'].includes(v.voucherType))
        .flatMap((v) =>
          v.lineItems
            .filter((li) => expenseLedgerIds.has(li.ledgerId))
            .map((li) => ({
              name:
                expenseLedgerMap.get(li.ledgerId)?.ledgerName ||
                'Unknown Expense',
              amount: li.amount,
            }))
        ),
      // Expenses from Payment voucher party ledgers
      ...vouchers
        .filter(
          (v) =>
            v.voucherType === 'Payment' && expenseLedgerIds.has(v.partyLedger)
        )
        .map((v) => ({
          name:
            expenseLedgerMap.get(v.partyLedger)?.ledgerName ||
            'Unknown Expense',
          amount: v.totalAmount,
        })),
    ];

    const expenseBreakdown = allExpenses.reduce((acc, expense) => {
      acc[expense.name] = (acc[expense.name] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = Object.values(expenseBreakdown).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return { expenseBreakdown, totalExpenses };
  };

  const { expenseBreakdown, totalExpenses } = calculateExpenses(filteredVouchers);

  const netProfit = totalIncome - totalExpenses;

  // --- Static Snapshot Data ---
  const bankBalance = mockLedgers
    .filter((l) => l.group === 'Bank Accounts' && !l.isGroup)
    .reduce((acc, l) => acc + l.currentBalance, 0);

  const cashBalance =
    mockLedgers.find((l) => l.ledgerName === 'Cash in Hand')?.currentBalance ||
    0;

  const tdsPayable = mockLedgers
    .filter((l) => l.parentLedgerId === 'group-tds-payable' && !l.isGroup)
    .reduce((acc, l) => acc + l.currentBalance, 0);

  const outstandingReceivables = mockLedgers
    .filter((l) => l.group === 'Sundry Debtor' && !l.isGroup)
    .reduce((acc, l) => acc + l.currentBalance, 0);

  const outstandingPayables = mockLedgers
    .filter((l) => l.group === 'Sundry Creditor' && !l.isGroup)
    .reduce((acc, l) => acc + l.currentBalance, 0);

  const pendingNotes = mockNotes.filter(
    (n) => n.status === 'Pending'
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysReminders = mockNotes.filter((n) => {
    if (!n.reminderDate) return false;
    const reminderDate = new Date(n.reminderDate);
    reminderDate.setHours(0, 0, 0, 0);
    return reminderDate.getTime() === today.getTime();
  }).length;

  // --- Chart Configurations ---
  const chartColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

  const sortedExpenses = Object.entries(expenseBreakdown).sort(
    ([, a], [, b]) => b - a
  );
  const expenseChartData = sortedExpenses.map(([name, value], index) => ({
    name,
    value,
    fill: `var(--color-${chartColors[index % chartColors.length]})`,
  }));

  const expenseChartConfig = {
    value: { label: 'Amount' },
    ...sortedExpenses.reduce((acc, [name], index) => {
      const key = name.toLowerCase().replace(/ & | /g, '-');
      acc[key] = {
        label: name,
        color: `hsl(var(--${chartColors[index % chartColors.length]}))`,
      };
      return acc;
    }, {} as any),
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Firm Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select defaultValue={mockCompanies[0]?.id}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {mockCompanies
                .filter((c) => c.status === 'Active')
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bank Balance
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(bankBalance)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
            <p className="text-xs text-muted-foreground">Total available cash</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TDS Payable</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tdsPayable)}</div>
            <p className="text-xs text-muted-foreground">
              To be deposited to government
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Notes</CardTitle>
            <Notebook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingNotes}</div>
            <p className="text-xs text-muted-foreground">
              Actionable items to review
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Reminders
            </CardTitle>
            <AlarmClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysReminders}</div>
            <p className="text-xs text-muted-foreground">
              Notes marked for today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your last 5 transactions in the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions vouchers={filteredVouchers.slice(0, 5)} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>
              Summary of expenses for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <DashboardChart
              data={expenseChartData}
              config={expenseChartConfig}
              totalValue={totalExpenses}
            />
            <div className="space-y-2">
              <ScrollArea className="h-56">
                <div className="space-y-4 pr-4">
                  {expenseChartData.length > 0 ? (
                    expenseChartData.map((item) => {
                      const key = item.name.toLowerCase().replace(/ & | /g, '-');
                      const percentage =
                        totalExpenses > 0
                          ? (item.value / totalExpenses) * 100
                          : 0;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center group cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: expenseChartConfig[key]?.color,
                              }}
                            />
                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-sm">
                              {formatCurrency(item.value)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground">
                      No expense data for this period.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecentTransactions({ vouchers }: { vouchers: Voucher[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Voucher No.</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vouchers.length > 0 ? (
          vouchers.map((voucher) => (
            <TableRow key={voucher.id}>
              <TableCell>
                {new Date(voucher.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              <TableCell className="font-medium">
                {voucher.voucherNumber}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{voucher.voucherType}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(voucher.totalAmount)}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No transactions for this period.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
