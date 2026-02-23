
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
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Voucher, Ledger, Company } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';


// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function DashboardPage() {
  const { profile } = useUser();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);
  const canExport = profile?.role === 'Owner' || profile?.role === 'Admin';
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: new Date(2023, 11, 31),
  });

  const [upcomingTdsDueDate, setUpcomingTdsDueDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    if (currentDay <= 7) {
        setUpcomingTdsDueDate(new Date(currentYear, currentMonth, 7));
    } else {
        setUpcomingTdsDueDate(new Date(currentYear, currentMonth + 1, 7));
    }
  }, []);

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

  // --- TDS Calculation Logic ---
  const expenseLedgerTdsMap = React.useMemo(() => new Map(
      mockLedgers
          .filter(l => l.group === 'Expense' && l.tdsTcsConfig?.tdsEnabled && l.tdsTcsConfig.tdsRate)
          .map(l => [l.id, l.tdsTcsConfig])
  ), []);

  const { totalTdsDeducted, tdsBreakdown } = React.useMemo(() => {
      let totalTds = 0;
      const breakdown: Record<string, { name: string; value: number; section: string }> = {};

      filteredVouchers.forEach(v => {
          if ((v.voucherType === 'Payment' || v.voucherType === 'Journal')) {
              const partyLedgerId = v.partyLedger;
              const tdsConfig = expenseLedgerTdsMap.get(partyLedgerId);
              if (tdsConfig?.tdsRate) {
                  // Assuming totalAmount is the base for TDS as per mock data structure
                  const tdsAmount = v.totalAmount * (tdsConfig.tdsRate / 100);
                  totalTds += tdsAmount;
                  const section = tdsConfig.tdsSection || 'Unknown';
                  const sectionName = `Sec ${section}`;
                  if (!breakdown[sectionName]) {
                      breakdown[sectionName] = { name: sectionName, value: 0, section };
                  }
                  breakdown[sectionName].value += tdsAmount;
              }
          }
      });
      return { totalTdsDeducted: totalTds, tdsBreakdown: Object.values(breakdown) };
  }, [filteredVouchers, expenseLedgerTdsMap]);

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

  // --- Chart Configurations ---
  const chartColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

  const sortedExpenses = Object.entries(expenseBreakdown).sort(
    ([, a], [, b]) => b - a
  );
  const expenseChartData = sortedExpenses.map(([name, value]) => {
    const key = name.toLowerCase().replace(/ & | /g, '-');
    return {
      name,
      value,
      fill: `var(--color-${key})`,
    };
  });

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

  const tdsChartData = tdsBreakdown.map((item) => {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
      ...item,
      fill: `var(--color-${key})`,
    };
  });

  const tdsChartConfig = {
    value: { label: 'Amount' },
    ...tdsBreakdown.reduce((acc, item, index) => {
      const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      acc[key] = {
        label: item.name,
        color: `hsl(var(--${chartColors[(index + 2) % chartColors.length]}))`,
      };
      return acc;
    }, {} as any),
  } satisfies ChartConfig;

  const handleExport = async (formatType: 'pdf' | 'xlsx') => {
      setIsExporting(true);
      toast({ title: 'Exporting...', description: `Your dashboard data is being prepared as a ${formatType.toUpperCase()} file.` });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      const company = mockCompanies[0];
      const dateStr = format(new Date(), 'yyyy_MM_dd');
      const filename = `ProAccounting_Dashboard_${dateStr}`;
      
      const exportData = {
          company: company,
          dateRange: date ? { from: date.from, to: date.to } : undefined,
          summary: {
            totalIncome, totalExpenses, netProfit,
            bankBalance, cashBalance, tdsPayable,
            outstandingReceivables, outstandingPayables
          },
          voucherCount: filteredVouchers.length,
          ledgerCount: mockLedgers.length
      };

      if (formatType === 'xlsx') {
          exportToExcel(exportData, filename);
      } else {
          exportToPdf(exportData, filename);
      }

      setIsExporting(false);
      toast({ title: 'Export Successful', description: 'Your file has been downloaded.' });
  };


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
            {canExport && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isExporting}>
                          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          Export
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                          <FileText className="mr-2 h-4 w-4" />
                          Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export as Excel
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}
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
              Upcoming TDS Due Date
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {upcomingTdsDueDate ? (
                    format(upcomingTdsDueDate, 'dd MMM yyyy')
                ) : (
                    <span className="text-muted-foreground text-lg">Loading...</span>
                )}
            </div>
            {upcomingTdsDueDate && (
                <p className="text-xs text-muted-foreground">
                    For TDS deducted in {format(new Date(upcomingTdsDueDate.getFullYear(), upcomingTdsDueDate.getMonth() - 1, 1), 'MMMM')}
                </p>
            )}
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
        <Card className="lg:col-span-7">
            <CardHeader>
                <CardTitle>TDS Deduction Summary</CardTitle>
                <CardDescription>
                    Section-wise TDS deducted in the selected period.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <DashboardChart
                    data={tdsChartData}
                    config={tdsChartConfig}
                    totalValue={totalTdsDeducted}
                />
                 <div className="space-y-2">
                  <ScrollArea className="h-40">
                    <div className="space-y-4 pr-4">
                      {tdsChartData.length > 0 ? (
                        tdsChartData.map((item) => {
                          const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                          const percentage =
                            totalTdsDeducted > 0
                              ? (item.value / totalTdsDeducted) * 100
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
                                    backgroundColor: tdsChartConfig[key]?.color,
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
                          No TDS deducted in this period.
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

// --- EXPORT HELPERS ---

type ExportData = {
    company: Company;
    dateRange?: { from?: Date, to?: Date };
    summary: {
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        bankBalance: number;
        cashBalance: number;
        tdsPayable: number;
        outstandingReceivables: number;
        outstandingPayables: number;
    };
    voucherCount: number;
    ledgerCount: number;
};

const exportToPdf = (data: ExportData, filename: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const { company, dateRange, summary } = data;
    const exportDate = format(new Date(), 'PPP p');
    let finalY = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(company.companyName, 14, finalY);
    finalY += 8;
    doc.setFontSize(12);
    doc.text("Dashboard Summary Report", 14, finalY);
    finalY += 6;
    doc.setFontSize(10);
    doc.text(`Exported on: ${exportDate}`, 14, finalY);
    if (dateRange?.from && dateRange.to) {
        finalY += 5;
        doc.text(`Period: ${format(dateRange.from, 'PPP')} to ${format(dateRange.to, 'PPP')}`, 14, finalY);
    }
    finalY += 10;
    
    // Financial Summary
    (doc as jsPDFType & { autoTable: (options: any) => void }).autoTable({
        startY: finalY,
        head: [['Financial Summary']],
        body: [
            ['Total Income', formatCurrency(summary.totalIncome)],
            ['Total Expenses', formatCurrency(summary.totalExpenses)],
            [{ content: 'Net Profit / (Loss)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(summary.netProfit), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Key Metrics side-by-side
    (doc as jsPDFType & { autoTable: (options: any) => void }).autoTable({
        startY: finalY,
        head: [['Key Balances', 'Amount'], ['Outstanding', 'Amount']],
        body: [
            [
                { content: 'Bank Balance' }, { content: formatCurrency(summary.bankBalance) },
                { content: 'Receivables' }, { content: formatCurrency(summary.outstandingReceivables) },
            ],
            [
                { content: 'Cash in Hand' }, { content: formatCurrency(summary.cashBalance) },
                { content: 'Payables' }, { content: formatCurrency(summary.outstandingPayables) },
            ],
            [
                { content: 'TDS Payable' }, { content: formatCurrency(summary.tdsPayable) },
                '', ''
            ],
        ],
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 200, { align: 'center' });
    }

    doc.save(`${filename}.pdf`);
};

const exportToExcel = (data: ExportData, filename: string) => {
    const { company, dateRange, summary, voucherCount, ledgerCount } = data;
    const exportDate = format(new Date(), 'PPP p');

    const ws_data = [
        ["Company:", company.companyName],
        ["Report:", "Dashboard Summary"],
        ["Export Date:", exportDate],
    ];

    if (dateRange?.from && dateRange.to) {
        ws_data.push(["Period:", `${format(dateRange.from, 'PPP')} to ${format(dateRange.to, 'PPP')}`]);
    }
    ws_data.push([]); // Spacer row

    ws_data.push(["Financial Summary", ""]);
    ws_data.push(["Total Income", summary.totalIncome]);
    ws_data.push(["Total Expenses", summary.totalExpenses]);
    ws_data.push(["Net Profit / (Loss)", summary.netProfit]);
    ws_data.push([]);

    ws_data.push(["Key Balances", ""]);
    ws_data.push(["Bank Balance", summary.bankBalance]);
    ws_data.push(["Cash in Hand", summary.cashBalance]);
    ws_data.push(["TDS Payable", summary.tdsPayable]);
    ws_data.push([]);

    ws_data.push(["Outstanding", ""]);
    ws_data.push(["Receivables", summary.outstandingReceivables]);
    ws_data.push(["Payables", summary.outstandingPayables]);
    ws_data.push([]);

    ws_data.push(["Other Metrics", ""]);
    ws_data.push(["Vouchers in Period", voucherCount]);
    ws_data.push(["Total Ledgers", ledgerCount]);


    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Auto column width
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }];
    
    // Apply number formatting for currency
    const currencyFormat = `_("₹"* #,##0.00_);_("₹"* (#,##0.00);_("₹"* "-"??_);_(@_)`;
    const numberFormat = '#,##0';
    for (let R = 0; R < ws_data.length; ++R) {
        if (typeof ws_data[R][1] === 'number') {
            const cell = ws[XLSX.utils.encode_cell({c:1, r:R})];
            if(cell) {
                cell.t = 'n';
                cell.z = currencyFormat;
            }
        }
    }
    
    // Bold headers
    const boldStyle = { font: { bold: true } };
    ["A6", "A11", "A16", "A21"].forEach(cellRef => {
        if(ws[cellRef]) ws[cellRef].s = boldStyle;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Summary');
    XLSX.writeFile(wb, `${filename}.xlsx`);
};
