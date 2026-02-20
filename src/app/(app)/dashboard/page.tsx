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
  FileText,
  BadgePercent,
  CalendarCheck,
  FileWarning
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockVouchers, mockLedgers, mockCompanies } from '@/lib/data';
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
    const filteredVouchers = mockVouchers.filter(v => {
        const voucherDate = new Date(v.date);
        if (!date?.from || !date?.to) return true;
        return voucherDate >= date.from && voucherDate <= date.to;
    });

    const ledgerMap = new Map(mockLedgers.map(l => [l.id, l]));


    // --- Dynamic Data Calculation Logic ---
    const totalIncome = filteredVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0), 0);

    const expenseLedgers = mockLedgers.filter(l => l.group === 'Expense' && !l.isGroup);
    const expenseLedgerIds = new Set(expenseLedgers.map(l => l.id));
    const expenseLedgerMap = new Map(expenseLedgers.map(l => [l.id, l]));

    // Refactored expense calculation to be pure
    const calculateExpenses = (vouchers: Voucher[]) => {
      const allExpenses = [
        // Purchases
        ...vouchers
            .filter(v => v.voucherType === 'Purchase')
            .map(v => ({
                name: 'Purchases',
                amount: v.lineItems.reduce((acc, item) => acc + item.amount, 0)
            })),
        // Other Expenses from Payment/Journal line items
        ...vouchers
            .filter(v => ['Payment', 'Journal'].includes(v.voucherType))
            .flatMap(v => v.lineItems
                .filter(li => expenseLedgerIds.has(li.ledgerId))
                .map(li => ({
                    name: expenseLedgerMap.get(li.ledgerId)?.ledgerName || 'Unknown Expense',
                    amount: li.amount
                }))
            ),
        // Expenses from Payment voucher party ledgers
        ...vouchers
            .filter(v => v.voucherType === 'Payment' && expenseLedgerIds.has(v.partyLedger))
            .map(v => ({
                name: expenseLedgerMap.get(v.partyLedger)?.ledgerName || 'Unknown Expense',
                amount: v.totalAmount
            }))
      ];
      
      const expenseBreakdown = allExpenses.reduce((acc, expense) => {
          acc[expense.name] = (acc[expense.name] || 0) + expense.amount;
          return acc;
      }, {} as Record<string, number>);

      const totalExpenses = Object.values(expenseBreakdown).reduce((sum, amount) => sum + amount, 0);

      return { expenseBreakdown, totalExpenses };
    };
    
    const { expenseBreakdown, totalExpenses } = calculateExpenses(filteredVouchers);
    
    const netProfit = totalIncome - totalExpenses;

    const outputGst = filteredVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const inputGst = filteredVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const gstPayable = Math.max(0, outputGst - inputGst);
    
    // --- TDS Calculation Logic ---
    const tdsTransactions = filteredVouchers
        .map(v => {
            if (v.voucherType !== 'Payment') return null;

            const partyLedger = ledgerMap.get(v.partyLedger);
            if (partyLedger?.tdsTcsConfig?.tdsEnabled && partyLedger?.tdsTcsConfig?.tdsRate) {
                return {
                    ...v,
                    tdsSection: partyLedger.tdsTcsConfig.tdsSection || 'N/A',
                    tdsAmount: v.totalAmount * (partyLedger.tdsTcsConfig.tdsRate / 100)
                };
            }
            return null;
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

    const totalTdsDeducted = tdsTransactions.reduce((acc, t) => acc + t.tdsAmount, 0);

    const tdsBreakdown = tdsTransactions.reduce((acc, t) => {
        const section = t.tdsSection;
        acc[section] = (acc[section] || 0) + t.tdsAmount;
        return acc;
    }, {} as Record<string, number>);

    const pendingTdsPayable = totalTdsDeducted; // Simplification for demo

    let tdsDueDate: Date | null = null;
    if (tdsTransactions.length > 0) {
        const latestTdsDate = new Date(Math.max(...tdsTransactions.map(t => new Date(t.date).getTime())));
        if (latestTdsDate) {
            const month = latestTdsDate.getMonth();
            const year = latestTdsDate.getFullYear();
            tdsDueDate = new Date(year, month + 1, 7);
        }
    }


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

    // --- Chart Configurations ---
    const chartColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
    
    const sortedExpenses = Object.entries(expenseBreakdown).sort(([, a], [, b]) => b - a);
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
      }, {} as any)
    } satisfies ChartConfig;

    const sortedTds = Object.entries(tdsBreakdown).sort(([, a], [, b]) => b - a);
    const tdsChartData = sortedTds.map(([name, value], index) => ({
      name,
      value,
      fill: `var(--color-${chartColors[index % chartColors.length]})`,
    }));
    const tdsChartConfig = {
      value: { label: 'Amount' },
      ...sortedTds.reduce((acc, [name], index) => {
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
                {mockCompanies.filter(c => c.status === 'Active').map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Income */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
         <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
            <CardContent className="flex flex-col gap-6">
                <DashboardChart data={expenseChartData} config={expenseChartConfig} totalValue={totalExpenses} />
                <div className="space-y-2">
                    <ScrollArea className="h-56">
                        <div className="space-y-4 pr-4">
                            {expenseChartData.length > 0 ? (
                                expenseChartData
                                    .map((item) => {
                                        const key = item.name.toLowerCase().replace(/ & | /g, '-');
                                        const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
                                        return (
                                            <div key={item.name} className="flex items-center group cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: expenseChartConfig[key]?.color }}
                                                    />
                                                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold text-sm">{formatCurrency(item.value)}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">{percentage.toFixed(0)}%</span>
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
      
      {/* TDS Section */}
      <div className="space-y-6 pt-6">
        <Separator />
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">TDS Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total TDS Deducted</CardTitle>
                    <BadgePercent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalTdsDeducted)}</div>
                    <p className="text-xs text-muted-foreground">For the selected period</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending TDS Payable</CardTitle>
                    <BadgePercent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(pendingTdsPayable)}</div>
                    <p className="text-xs text-muted-foreground">Total amount to be paid</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming TDS Due Date</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {tdsDueDate ? tdsDueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">For deductions in last transaction month</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">TDS Return Status</CardTitle>
                    <FileWarning className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">To be Filed</div>
                    <p className="text-xs text-muted-foreground">For Q3 (Oct-Dec 2023)</p>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>TDS Section Breakdown</CardTitle>
                <CardDescription>Summary of TDS deductions for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <DashboardChart data={tdsChartData} config={tdsChartConfig} totalValue={totalTdsDeducted} />
                <div className="space-y-2">
                    <ScrollArea className="h-40">
                        <div className="space-y-4 pr-4">
                            {tdsChartData.length > 0 ? (
                                tdsChartData
                                    .map((item) => {
                                        const key = item.name.toLowerCase().replace(/ & | /g, '-');
                                        const percentage = totalTdsDeducted > 0 ? (item.value / totalTdsDeducted) * 100 : 0;
                                        return (
                                            <div key={item.name} className="flex items-center group cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: tdsChartConfig[key]?.color }}
                                                    />
                                                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">TDS on {item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold text-sm">{formatCurrency(item.value)}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">{percentage.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground">
                                    No TDS data for this period.
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
