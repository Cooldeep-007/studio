
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
  Minus,
  AlertTriangle,
  Scale,
  GanttChartSquare,
  BookOpen,
  FileOutput,
  FilePlus2,
  PiggyBank
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format, subMonths, subYears, differenceInDays, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
  TableFooter
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { mockVouchers, mockLedgers, mockCompanies } from '@/lib/data';
import type { Voucher, Ledger, Company } from '@/lib/types';
import { MOCK_DATA_YEAR } from '@/lib/data';

// --- Helper Functions ---
const formatCurrency = (amount: number, minimumFractionDigits = 2) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(amount);
};

const formatPercentage = (value: number) => {
    if (!isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
}

const getGrowth = (current: number, previous: number) => {
    if (previous === 0) {
        return current > 0 ? Infinity : 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
};

// --- Data Calculation Logic ---
const processFinancials = (vouchers: Voucher[], ledgers: Ledger[], startDate: Date, endDate: Date) => {
    const periodVouchers = vouchers.filter(v => {
        const d = new Date(v.date);
        return d >= startDate && d <= endDate;
    });

    const directExpenseLedgers = new Set(ledgers.filter(l => l.parentLedgerId === 'group-purchase-accounts' || l.id === 'led-purchase-account').map(l => l.id));
    const indirectExpenseLedgers = new Set(ledgers.filter(l => l.parentLedgerId === 'group-indirect-expenses').map(l => l.id));
    
    let totalRevenue = 0;
    let totalDirectExpenses = 0;
    const indirectExpensesBreakdown: Record<string, number> = {};
    let totalOutputGst = 0;
    let totalInputGst = 0;

    periodVouchers.forEach(v => {
        if (v.voucherType === 'Sales') {
            totalRevenue += v.totalAmount - (v.lineItems[0].taxAmount || 0);
            totalOutputGst += v.lineItems[0].taxAmount || 0;
        }
        if (v.voucherType === 'Purchase') {
            totalDirectExpenses += v.totalAmount - (v.lineItems[0].taxAmount || 0);
            totalInputGst += v.lineItems[0].taxAmount || 0;
        }
        if (v.voucherType === 'Payment' || v.voucherType === 'Journal') {
            v.lineItems.forEach(li => {
                if (indirectExpenseLedgers.has(li.ledgerId)) {
                    const ledger = ledgers.find(l => l.id === li.ledgerId);
                    if (ledger) {
                        indirectExpensesBreakdown[ledger.ledgerName] = (indirectExpensesBreakdown[ledger.ledgerName] || 0) + li.amount;
                    }
                }
            });
        }
    });

    const totalIndirectExpenses = Object.values(indirectExpensesBreakdown).reduce((sum, amount) => sum + amount, 0);
    const grossProfit = totalRevenue - totalDirectExpenses;
    const netProfit = grossProfit - totalIndirectExpenses;
    
    return {
        totalRevenue,
        totalDirectExpenses,
        grossProfit,
        indirectExpensesBreakdown,
        totalIndirectExpenses,
        netProfit,
        totalOutputGst,
        totalInputGst,
        monthlyData: calculateMonthlyBreakdown(periodVouchers, ledgers),
    };
};

const calculateMonthlyBreakdown = (vouchers: Voucher[], ledgers: Ledger[]) => {
  const monthlyData: Record<string, { revenue: number, expenses: number, profit: number }> = {};

  vouchers.forEach(v => {
    const month = format(new Date(v.date), 'MMM yy');
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
    }
    if (v.voucherType === 'Sales') {
      monthlyData[month].revenue += v.totalAmount - (v.lineItems[0].taxAmount || 0);
    } else if (v.voucherType === 'Purchase' || v.voucherType === 'Payment' || v.voucherType === 'Journal') {
        const indirectExpenseLedgers = new Set(ledgers.filter(l => l.parentLedgerId === 'group-indirect-expenses').map(l => l.id));
        const directExpenseLedgers = new Set(ledgers.filter(l => l.parentLedgerId === 'group-purchase-accounts' || l.id === 'led-purchase-account').map(l => l.id));

        v.lineItems.forEach(li => {
            if (directExpenseLedgers.has(li.ledgerId) || indirectExpenseLedgers.has(li.ledgerId)) {
                monthlyData[month].expenses += li.amount;
            }
        });
        if (v.voucherType === 'Purchase') { // Add non-tax amount for purchases
             monthlyData[month].expenses += v.totalAmount - (v.lineItems[0]?.taxAmount || 0)
        }
    }
  });

  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
  });
  
  return Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })).sort((a,b) => new Date(`01 ${a.name}`).getTime() - new Date(`01 ${b.name}`).getTime());
}


export default function DashboardPage() {
  const { profile } = useUser();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);
  const canExport = profile?.role === 'Owner' || profile?.role === 'Admin';
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(MOCK_DATA_YEAR, 3, 1), // Current FY Start
    to: new Date(MOCK_DATA_YEAR + 1, 2, 31), // Current FY End
  });

  const {
      currentPeriodData,
      prevPeriodData,
      growth,
      ratios,
      alerts,
      cashFlow,
      tdsSummary,
  } = React.useMemo(() => {
      if (!date?.from || !date?.to) {
          return { currentPeriodData: null, prevPeriodData: null, growth: {}, ratios: {}, alerts: [], cashFlow: {}, tdsSummary: { totalPayable: 0, breakdown: [] } };
      }

      const currentPeriodData = processFinancials(mockVouchers, mockLedgers, date.from, date.to);

      const periodLength = differenceInDays(date.to, date.from);
      const prevPeriodStart = subDays(date.from, periodLength + 1);
      const prevPeriodEnd = subDays(date.to, periodLength + 1);
      const prevPeriodData = processFinancials(mockVouchers, mockLedgers, prevPeriodStart, prevPeriodEnd);
      
      const { totalRevenue, totalDirectExpenses, totalIndirectExpenses, netProfit, totalOutputGst, totalInputGst } = currentPeriodData;
      const totalExpenses = totalDirectExpenses + totalIndirectExpenses;
      
      const growth = {
          revenue: getGrowth(totalRevenue, prevPeriodData.totalRevenue),
          expenses: getGrowth(totalExpenses, prevPeriodData.totalDirectExpenses + prevPeriodData.totalIndirectExpenses),
          profit: getGrowth(netProfit, prevPeriodData.netProfit),
      };

      const ratios = {
          netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          expenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
          gstLiability: totalOutputGst - totalInputGst,
          gstLiabilityRatio: totalRevenue > 0 ? ((totalOutputGst - totalInputGst) / totalRevenue) * 100 : 0,
      };

      // Alerts
      const alerts = [];
      if(netProfit < 0) alerts.push({ type: 'error', message: 'Net Profit is negative for the selected period.' });
      const backdatedVouchers = mockVouchers.filter(v => new Date(v.createdAt) > new Date(v.date) && differenceInDays(new Date(v.createdAt), new Date(v.date)) > 1);
      if(backdatedVouchers.length > 0) alerts.push({ type: 'warning', message: `${backdatedVouchers.length} backdated voucher(s) found.` });
      
      const highReceivables = mockLedgers.filter(l => l.group === 'Sundry Debtor' && l.currentBalance > 50000);
      if(highReceivables.length > 0) alerts.push({ type: 'warning', message: `${highReceivables.length} customer(s) with high outstanding balance.`});

      // Cash Flow
      const cashFlow = {
        cashInHand: mockLedgers.find(l => l.ledgerName === 'Cash in Hand')?.currentBalance || 0,
        bankBalance: mockLedgers.filter(l => l.group === 'Bank Accounts').reduce((acc, l) => acc + l.currentBalance, 0),
        receivables: mockLedgers.filter(l => l.group === 'Sundry Debtor').reduce((acc, l) => acc + l.currentBalance, 0),
        payables: mockLedgers.filter(l => l.group === 'Sundry Creditor').reduce((acc, l) => acc + l.currentBalance, 0),
      }
      
      // TDS Summary
      const tdsPayableLedgers = mockLedgers.filter(l => l.parentLedgerId === 'group-tds-payable');
      const tdsSummary = {
        totalPayable: tdsPayableLedgers.reduce((acc, l) => acc + l.currentBalance, 0),
        breakdown: tdsPayableLedgers.map(l => ({ name: l.ledgerName, balance: l.currentBalance }))
      };


      return { currentPeriodData, prevPeriodData, growth, ratios, alerts, cashFlow, tdsSummary };

  }, [date]);

 const formatCurrencyForPdf = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
  };


  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const companyName = mockCompanies[0]?.companyName || 'Pro Accounting';
    const period = `For: ${date?.from ? format(date.from, "PP") : ''} to ${date?.to ? format(date.to, "PP") : ''}`;
    const exportDate = format(new Date(), 'PPP p');

    // Add Header
    doc.setFontSize(18);
    doc.text(`${companyName} - Dashboard Summary Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`(All amounts in INR)`, 14, 25);
    doc.setFontSize(12);
    doc.text(period, 14, 32);
    doc.setFontSize(10);
    doc.text(`Exported on: ${exportDate}`, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });


    // Financial Summary Table
    if (currentPeriodData) {
        const { totalRevenue, totalDirectExpenses, grossProfit, totalIndirectExpenses, netProfit } = currentPeriodData;
        
        (doc as any).autoTable({
            startY: 40,
            head: [['Financial Summary', 'Amount']],
            headStyles: { halign: 'center', fillColor: [41, 128, 185] },
            columnStyles: { 1: { halign: 'right' } },
            body: [
                ['Revenue', formatCurrencyForPdf(totalRevenue)],
                ['Direct Expenses', formatCurrencyForPdf(totalDirectExpenses)],
                ['Gross Profit', formatCurrencyForPdf(grossProfit)],
                ['Indirect Expenses', formatCurrencyForPdf(totalIndirectExpenses)],
                ['Net Profit', formatCurrencyForPdf(netProfit)],
            ],
            theme: 'grid',
            didParseCell: (data: any) => {
                if(data.row.index === 2 || data.row.index === 4) { // Gross & Net Profit
                     data.cell.styles.fontStyle = 'bold';
                }
            }
        });
    }
    
    let finalY = (doc as any).lastAutoTable.finalY;

    // Key Balances & Ratios
    (doc as any).autoTable({
        startY: finalY + 10,
        head: [['Key Balances & Ratios', 'Value']],
        headStyles: { halign: 'center', fillColor: [41, 128, 185] },
        columnStyles: { 1: { halign: 'right' } },
        body: [
            ['Cash in Hand', formatCurrencyForPdf(cashFlow.cashInHand)],
            ['Bank Balance', formatCurrencyForPdf(cashFlow.bankBalance)],
            ['Outstanding Receivables', formatCurrencyForPdf(cashFlow.receivables)],
            ['Outstanding Payables', formatCurrencyForPdf(cashFlow.payables)],
            ['Net Profit %', formatPercentage(ratios.netProfitMargin)],
            ['Expense Ratio %', formatPercentage(ratios.expenseRatio)],
            ['GST Liability', formatCurrencyForPdf(ratios.gstLiability)],
        ],
        theme: 'grid',
    });

    // TDS Summary Table
    (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['TDS / TCS Summary', 'Amount']],
        headStyles: { halign: 'center', fillColor: [39, 174, 96] },
        columnStyles: { 1: { halign: 'right' } },
        body: [
            ...tdsSummary.breakdown.map(item => [item.name, formatCurrencyForPdf(item.balance)]),
        ],
        theme: 'grid',
    });

    (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY,
        body: [['Total Payable', formatCurrencyForPdf(tdsSummary.totalPayable)]],
        theme: 'grid',
        bodyStyles: { fontStyle: 'bold', halign: 'right' },
    });

    // Add Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 287, { align: 'center' });
    }

    doc.save(`ProAccounting_Dashboard_${format(new Date(), 'yyyy_MM_dd')}.pdf`);
};

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    const companyName = mockCompanies[0]?.companyName || "Pro Accounting";
    
    // Header
    XLSX.utils.sheet_add_aoa(ws, [[`${companyName} - Dashboard Summary Report`]], { origin: 'A1' });
    ws['A1'].s = { font: { bold: true, sz: 16 } };
    XLSX.utils.sheet_add_aoa(ws, [[`Exported on: ${format(new Date(), 'PPP p')}`]], { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(ws, [[`Period: ${date?.from ? format(date.from, "PP") : ''} to ${date?.to ? format(date.to, "PP") : ''}`]], { origin: 'A3' });

    let currentRow = 5;

    // Financial Summary
    if (currentPeriodData) {
        const { totalRevenue, totalDirectExpenses, grossProfit, totalIndirectExpenses, netProfit } = currentPeriodData;
        XLSX.utils.sheet_add_aoa(ws, [['Financial Summary']], { origin: `A${currentRow}` });
        ws[`A${currentRow}`].s = { font: { bold: true, sz: 14 } };
        currentRow++;
        const pnlData = [
            ['Description', 'Amount'],
            ['Revenue', totalRevenue],
            ['Direct Expenses', totalDirectExpenses],
            ['Gross Profit', grossProfit],
            ['Indirect Expenses', totalIndirectExpenses],
            ['Net Profit', netProfit],
        ];
        XLSX.utils.sheet_add_aoa(ws, pnlData, { origin: `A${currentRow}` });
        XLSX.utils.sheet_add_aoa(ws, [['Key Balances']], { origin: `D${currentRow}` });
        ws[`D${currentRow}`].s = { font: { bold: true, sz: 14 } };
        currentRow++;
        const balancesData = [
            ['Cash in Hand', cashFlow.cashInHand],
            ['Bank Balance', cashFlow.bankBalance],
            ['Receivables', cashFlow.receivables],
            ['Payables', cashFlow.payables],
        ];
        XLSX.utils.sheet_add_aoa(ws, balancesData, { origin: `D${currentRow}` });

        currentRow += Math.max(pnlData.length, balancesData.length) + 2;
    }

    // TDS Summary
    XLSX.utils.sheet_add_aoa(ws, [['TDS / TCS Summary']], { origin: `A${currentRow}` });
    ws[`A${currentRow}`].s = { font: { bold: true, sz: 14 } };
    currentRow++;
    const tdsData = [
        ['Description', 'Amount'],
        ...tdsSummary.breakdown.map(item => [item.name, item.balance]),
        ['Total Payable', tdsSummary.totalPayable],
    ];
    XLSX.utils.sheet_add_aoa(ws, tdsData, { origin: `A${currentRow}` });

    // Auto-fit columns
    const cols = [{ wch: 30 }, { wch: 20 }, { wch: 5 }, { wch: 30 }, { wch: 20 }];
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
    XLSX.writeFile(wb, `ProAccounting_Dashboard_${format(new Date(), 'yyyy_MM_dd')}.xlsx`);
};

  const handleExport = (formatType: 'pdf' | 'xlsx') => {
    if(!currentPeriodData) {
        toast({ variant: 'destructive', title: 'Error', description: 'No data available to export.' });
        return;
    }
    setIsExporting(true);
    toast({ title: 'Exporting...', description: `Your dashboard data is being prepared.` });
    
    // Simulate processing time
    setTimeout(() => {
        try {
            if (formatType === 'pdf') {
                exportToPdf();
            } else {
                exportToExcel();
            }
            toast({ title: 'Export Successful', description: 'Your file has been downloaded.' });
        } catch (error) {
            console.error("Export failed:", error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'An unexpected error occurred.' });
        } finally {
            setIsExporting(false);
        }
    }, 1500);
  }
  
  if (!currentPeriodData) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const { totalRevenue, totalDirectExpenses, grossProfit, indirectExpensesBreakdown, totalIndirectExpenses, netProfit, monthlyData } = currentPeriodData;
  const totalExpenses = totalDirectExpenses + totalIndirectExpenses;
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  const expenseChartData = Object.entries(indirectExpensesBreakdown).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length]
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Financial Intelligence Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select defaultValue={mockCompanies[0]?.id}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Company" /></SelectTrigger>
            <SelectContent>{mockCompanies.filter(c => c.status === 'Active').map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
          </Select>
          <DateRangePicker date={date} setDate={setDate} />
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" disabled={isExporting}>{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <GrowthCard title="Revenue" value={totalRevenue} change={growth.revenue} />
          <GrowthCard title="Total Expenses" value={totalExpenses} change={growth.expenses} isExpense />
          <GrowthCard title="Net Profit" value={netProfit} change={growth.profit} />
          <RatioCard title="Net Profit Margin" value={ratios.netProfitMargin} icon={BadgePercent} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
            <Card>
                <CardHeader><CardTitle>Profit &amp; Loss Statement</CardTitle><CardDescription>For the period: {date?.from ? format(date.from, "PP") : ''} - {date?.to ? format(date.to, "PP") : ''}</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell className="font-semibold">Revenue</TableCell><TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell><TableCell className="text-right text-muted-foreground">100.00%</TableCell></TableRow>
                            <TableRow><TableCell className="pl-8 text-muted-foreground">Direct Expenses</TableCell><TableCell className="text-right">{formatCurrency(totalDirectExpenses)}</TableCell><TableCell className="text-right text-muted-foreground">{formatPercentage(totalRevenue > 0 ? (totalDirectExpenses/totalRevenue)*100: 0)}</TableCell></TableRow>
                            <TableRow className="font-semibold bg-muted/30"><TableCell>Gross Profit</TableCell><TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell><TableCell className="text-right">{formatPercentage(totalRevenue > 0 ? (grossProfit/totalRevenue)*100: 0)}</TableCell></TableRow>
                            <TableRow><TableCell className="pl-8 text-muted-foreground">Indirect Expenses</TableCell><TableCell className="text-right">{formatCurrency(totalIndirectExpenses)}</TableCell><TableCell className="text-right text-muted-foreground">{formatPercentage(totalRevenue > 0 ? (totalIndirectExpenses/totalRevenue)*100: 0)}</TableCell></TableRow>
                            <TableRow className={cn("font-bold text-lg", netProfit >= 0 ? "bg-green-100/50 text-green-700" : "bg-red-100/50 text-red-700")}>
                                <TableCell>Net Profit</TableCell>
                                <TableCell className="text-right">{formatCurrency(netProfit)}</TableCell>
                                <TableCell className="text-right">{formatPercentage(ratios.netProfitMargin)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Scale />Ratio Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span>Net Profit %</span><span className={cn("font-semibold", ratios.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600')}>{formatPercentage(ratios.netProfitMargin)}</span></div>
                        <div className="flex justify-between"><span>Expense Ratio %</span><span className="font-semibold">{formatPercentage(ratios.expenseRatio)}</span></div>
                        <div className="flex justify-between"><span>GST Liability</span><span className="font-semibold">{formatCurrency(ratios.gstLiability)}</span></div>
                        <div className="flex justify-between"><span>GST Liability / Revenue %</span><span className="font-semibold">{formatPercentage(ratios.gstLiabilityRatio)}</span></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><GanttChartSquare />Cash Flow Snapshot</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span>Cash in Hand</span><span className="font-semibold">{formatCurrency(cashFlow.cashInHand)}</span></div>
                        <div className="flex justify-between"><span>Bank Balance</span><span className="font-semibold">{formatCurrency(cashFlow.bankBalance)}</span></div>
                        <div className="flex justify-between"><span>Outstanding Receivables</span><span className="font-semibold">{formatCurrency(cashFlow.receivables)}</span></div>
                        <div className="flex justify-between"><span>Outstanding Payables</span><span className="font-semibold">{formatCurrency(cashFlow.payables)}</span></div>
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Side Content */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle />Audit Alerts</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {alerts.length > 0 ? alerts.map((alert, i) => (
                        <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'} className={cn(alert.type === 'warning' && 'bg-amber-50 border-amber-200 [&>svg]:text-amber-500 text-amber-700')}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{alert.message}</AlertDescription>
                        </Alert>
                    )) : <p className="text-sm text-muted-foreground text-center py-4">No audit alerts for this period. ✨</p>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-blue-600"><FileOutput />TDS / TCS Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {tdsSummary.breakdown.length > 0 ? (
                        <>
                            <div className="flex justify-between font-bold text-base border-b pb-2">
                                <span>Total Payable</span>
                                <span>{formatCurrency(tdsSummary.totalPayable)}</span>
                            </div>
                            <div className="space-y-2 pt-2">
                                {tdsSummary.breakdown.map((tds, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{tds.name}</span>
                                        <span className="font-medium">{formatCurrency(tds.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No TDS/TCS data available.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Expense Distribution</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value, 0)} />
                             <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Revenue vs. Expenses</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `${value/1000}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, 0)} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                            <Bar dataKey="expenses" fill="#ff8042" name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Monthly Profit Trend</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `${value/1000}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, 0)} />
                            <Legend />
                            <Line type="monotone" dataKey="profit" stroke="#8884d8" name="Net Profit" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

    </div>
  );
}

// --- Sub Components for Cards ---
function GrowthCard({ title, value, change, isExpense = false }: { title: string, value: number, change: number, isExpense?: boolean }) {
    const isPositive = !isExpense ? change >= 0 : change <= 0;
    const isInfinite = !isFinite(change);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(value, 0)}</div>
                <p className={cn("text-xs", isInfinite || change === 0 ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-600")}>
                    {isInfinite ? 'New activity' : (
                        <span className="flex items-center gap-1">
                            {change >= 0 ? <TrendingUp className="h-4 w-4"/> : <TrendingDown className="h-4 w-4"/>}
                            {formatPercentage(Math.abs(change))} vs previous period
                        </span>
                    )}
                </p>
            </CardContent>
        </Card>
    )
}

function RatioCard({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", value >= 0 ? "text-green-600" : "text-red-600")}>{formatPercentage(value)}</div>
                 <p className="text-xs text-muted-foreground">For the selected period</p>
            </CardContent>
        </Card>
    )
}
