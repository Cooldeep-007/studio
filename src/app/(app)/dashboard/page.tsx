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

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount);
};


export default function DashboardPage() {
    // --- Data Calculation Logic ---
    const totalSales = mockVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0), 0);

    const totalPurchases = mockVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + item.amount, 0), 0);

    const totalIncome = mockLedgers
        .filter(l => l.group === 'Income' && !l.isGroup)
        .reduce((acc, l) => acc + l.currentBalance, 0);

    const totalExpenses = mockLedgers
        .filter(l => l.group === 'Expense' && !l.isGroup)
        .reduce((acc, l) => acc + l.currentBalance, 0);
    
    const netProfit = totalIncome - totalExpenses;

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

    const outputGst = mockVouchers
        .filter(v => v.voucherType === 'Sales')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const inputGst = mockVouchers
        .filter(v => v.voucherType === 'Purchase')
        .reduce((acc, v) => acc + v.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0);

    const gstPayable = Math.max(0, outputGst - inputGst);
    const gstCredit = Math.max(0, inputGst - outputGst);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Firm Dashboard</h1>
        <div className="flex items-center gap-4">
            <Select defaultValue={mockCompanies[0]?.id}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {mockCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>
        
        {/* Card 2: Net Profit/Loss */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit < 0 ? 'text-destructive' : ''}`}>{formatCurrency(netProfit)}</div>
            <p className="text-xs text-muted-foreground">{netProfit < 0 ? 'Down from last month' : 'Up from last month'}</p>
          </CardContent>
        </Card>

        {/* Card 3: Receivables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(outstandingReceivables)}</div>
            <p className="text-xs text-muted-foreground">Outstanding amount</p>
          </CardContent>
        </Card>
        
        {/* Card 4: Payables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(outstandingPayables)}</div>
            <p className="text-xs text-muted-foreground">Amount to be paid</p>
          </CardContent>
        </Card>
        
        {/* Card 5: Bank Balance */}
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
        
        {/* Card 6: Cash in Hand */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
            <p className="text-xs text-muted-foreground">Available cash</p>
          </CardContent>
        </Card>

        {/* Card 7: GST Payable */}
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
        
        {/* Card 8: GST Input Credit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GST Input Credit</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(gstCredit)}</div>
            <p className="text-xs text-muted-foreground">Available to claim</p>
          </CardContent>
        </Card>
      </div>


      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your last 5 transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Summary of expenses by category.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecentTransactions() {
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
        {mockVouchers.slice(0, 5).map((voucher) => (
          <TableRow key={voucher.id}>
            <TableCell>
              {new Date(voucher.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
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
        ))}
      </TableBody>
    </Table>
  );
}
