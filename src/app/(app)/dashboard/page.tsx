import { DollarSign, Banknote, Landmark, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { mockVouchers, mockLedgers } from '@/lib/data';

const chartData = [
  { group: 'Assets', total: 1015000, fill: 'var(--color-assets)' },
  { group: 'Liabilities', total: 1025000, fill: 'var(--color-liabilities)' },
  { group: 'Income', total: 10000, fill: 'var(--color-income)' },
  { group: 'Expense', total: 25000, fill: 'var(--color-expense)' },
];

const chartConfig = {
  total: {
    label: 'Total',
  },
  assets: {
    label: 'Assets',
    color: 'hsl(var(--chart-2))',
  },
  liabilities: {
    label: 'Liabilities',
    color: 'hsl(var(--chart-5))',
  },
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-1))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Firm Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$10,000.00</div>
            <p className="text-xs text-muted-foreground">from sales vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$25,000.00</div>
            <p className="text-xs text-muted-foreground">from payment vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-$15,000.00</div>
            <p className="text-xs text-muted-foreground">Revenue - Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$480,000.00</div>
            <p className="text-xs text-muted-foreground">Across all bank accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Trial Balance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0}}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="group"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="total" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
              {voucher.totalAmount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
