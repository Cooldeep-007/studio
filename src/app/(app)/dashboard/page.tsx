
"use client";

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
  FileText
} from 'lucide-react';
import type { DateRange } from "react-day-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
} from "@/components/ui/select";
import { DateRangePicker } from '@/components/date-range-picker';
import { mockVouchers, mockLedgers, mockCompanies } from '@/lib/data';
import type { Voucher, Ledger } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';


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
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date(),
    });

    // --- Data Filtering Logic ---
    const filteredVouchers = mockVouchers.filter(v => {
        const voucherDate = new Date(v.date);
        if (!date?.from || !date?.to) return true;
        return voucherDate >= date.from && voucherDate <= date.to;
    });

    // --- Dynamic Data Calculation Logic ---
    const totalSales = filteredVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0), 0);

    const totalPurchases = filteredVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0), 0);

    const totalIncome = totalSales;

    const expenseLedgers = mockLedgers.filter(l => l.group === 'Expense' && !l.isGroup);
    const expenseLedgerIds = new Set(expenseLedgers.map(l => l.id));
    const expenseLedgerMap = new Map(expenseLedgers.map(l => [l.id, l]));

    const expenseBreakdown: Record<string, number> = {};

    const periodPurchases = filteredVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((sum, v) => {
            const purchaseAmount = v.lineItems.reduce((acc, item) => acc + item.amount, 0);
            expenseBreakdown['Purchases'] = (expenseBreakdown['Purchases'] || 0) + purchaseAmount;
            return sum + purchaseAmount;
        }, 0);

    const otherExpenses = filteredVouchers
        .filter(v => v.voucherType === 'Payment' && expenseLedgerIds.has(v.partyLedger))
        .reduce((sum, v) => {
            const ledgerName = expenseLedgerMap.get(v.partyLedger)?.ledgerName || 'Unknown Expense';
            expenseBreakdown[ledgerName] = (expenseBreakdown[ledgerName] || 0) + v.totalAmount;
            return sum + v.totalAmount;
        }, 0);

    const totalExpenses = periodPurchases + otherExpenses;
    
    const netProfit = totalIncome - totalExpenses;

    const outputGst = filteredVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const inputGst = filteredVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const gstPayable = Math.max(0, outputGst - inputGst);
    
    // --- Static Snapshot Data ---
    const bankBalance = mockLedgers
        .filter(l => l.group === 'Bank Accounts' && !l.isGroup)
        .reduce((acc, l) => acc + l.currentBalance, 0);
    
    const cashBalance = mockLedgers
        .find(l => l.ledgerName === 'Cash in Hand')?.currentBalance || 0;

    const outstandingReceivables = mockLedgers
        .filter(l => l.group === 'Sundry Debtor' && !l.isGroup)
        .reduce((acc, l) => acc + l.currentBalance, 0);

    const outstandingPayables = mockLedgers
        .filter(l => l.group === 'Sundry Creditor' && !l.isGroup)
        .reduce((acc, l) => acc + l.currentBalance, 0);

    // --- Chart Configuration ---
    const chartColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
    const chartData = Object.entries(expenseBreakdown).map(([name, value], index) => ({
      name,
      value,
      fill: `var(--color-${chartColors[index % chartColors.length]})`,
    }));

    const chartConfig = {
      value: {
        label: 'Amount',
      },
      ...Object.entries(expenseBreakdown).reduce((acc, [name], index) => {
        const key = name.toLowerCase().replace(/ & | /g, '-');
        acc[key] = {
          label: name,
          color: `hsl(var(--${chartColors[index % chartColors.length]}))`,
        };
        return acc;
      }, {} as any)
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
                {mockCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">For the selected period</p>
          </CardContent>
        </Card>
        
        {/* Card 2: Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">For the selected period</p>
          </CardContent>
        </Card>
        
        {/* Card 3: Net Profit/Loss */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit < 0 ? 'text-destructive' : ''}`}>{formatCurrency(netProfit)}</div>
            <p className="text-xs text-muted-foreground">{netProfit < 0 ? 'Loss for this period' : 'Profit for this period'}</p>
          </CardContent>
        </Card>
        
        {/* Card 4: GST Payable */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GST Payable</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(gstPayable)}</div>
             <p className="text-xs text-muted-foreground">For this period</p>
          </CardContent>
        </Card>

        {/* Card 5: Receivables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(outstandingReceivables)}</div>
            <p className="text-xs text-muted-foreground">Total outstanding</p>
          </CardContent>
        </Card>
        
        {/* Card 6: Payables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(outstandingPayables)}</div>
            <p className="text-xs text-muted-foreground">Total to be paid</p>
          </CardContent>
        </Card>
        
        {/* Card 7: Bank Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(bankBalance)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
        
        {/* Card 8: Cash in Hand */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
            <p className="text-xs text-muted-foreground">Total available cash</p>
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
            <CardDescription>Summary of expenses for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} config={chartConfig} />
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
                  year: 'numeric'
                })}
              </TableCell>
              <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
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
