'use client';

import * as React from 'react';
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
import { DateRangePicker } from '@/components/date-range-picker';
import { mockVouchers, mockLedgers } from '@/lib/data';
import type { DateRange } from 'react-day-picker';
import { ArrowDown, ArrowUp, Wallet, Scale } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function CashBookPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const cashLedger = React.useMemo(
    () => mockLedgers.find((l) => l.ledgerName === 'Cash in Hand'),
    []
  );
  const ledgerMap = React.useMemo(
    () => new Map(mockLedgers.map((l) => [l.id, l])),
    []
  );

  const transactions = React.useMemo(() => {
    if (!cashLedger) return [];
    
    const cashTransactions = mockVouchers
      .filter((v) => {
        const voucherDate = new Date(v.date);
        return (
          (!date?.from || voucherDate >= date.from) &&
          (!date?.to || voucherDate <= date.to) &&
          v.entries.some((li) => li.ledgerId === cashLedger.id)
        );
      })
      .map((v) => {
        const cashEntry = v.entries.find((li) => li.ledgerId === cashLedger.id)!;
        const otherEntry = v.entries.find((li) => li.ledgerId !== cashLedger.id);
        
        let particulars = v.narration || 'Journal Adjustment';
        if (otherEntry) {
            particulars = ledgerMap.get(otherEntry.ledgerId)?.ledgerName || particulars;
        } else if (v.partyLedgerId) {
            particulars = ledgerMap.get(v.partyLedgerId)?.ledgerName || particulars;
        }

        return {
          ...v,
          debit: cashEntry.type === 'Dr' ? cashEntry.amount : 0,
          credit: cashEntry.type === 'Cr' ? cashEntry.amount : 0,
          particulars,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = (cashLedger.openingBalance || 0) * (cashLedger.balanceType === 'Cr' ? -1 : 1);
    return cashTransactions.map((tx) => {
      runningBalance += tx.debit - tx.credit;
      return { ...tx, balance: runningBalance };
    });
  }, [cashLedger, date, ledgerMap]);

  const openingBalance = cashLedger ? cashLedger.openingBalance * (cashLedger.balanceType === 'Cr' ? -1 : 1) : 0;
  const totalInflow = transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalOutflow = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const closingBalance = openingBalance + totalInflow - totalOutflow;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Cash Book</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(Math.abs(openingBalance))} <span className="text-sm font-medium text-muted-foreground">{openingBalance >= 0 ? 'Dr' : 'Cr'}</span></div>
            <p className="text-xs text-muted-foreground">As of {date?.from ? format(date.from, 'PPP') : 'start'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
            <ArrowUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.abs(closingBalance))} <span className="text-sm font-medium text-muted-foreground">{closingBalance >= 0 ? 'Dr' : 'Cr'}</span></div>
            <p className="text-xs text-muted-foreground">As of {date?.to ? format(date.to, 'PPP') : 'today'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Transactions</CardTitle>
          <CardDescription>
            Detailed view of all cash receipts and payments for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Voucher Type</TableHead>
                <TableHead>Voucher No</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>{tx.particulars}</TableCell>
                    <TableCell><Badge variant="outline">{tx.voucherType}</Badge></TableCell>
                    <TableCell>{tx.voucherNumber}</TableCell>
                    <TableCell className="text-right font-mono">{tx.debit > 0 ? formatCurrency(tx.debit) : ''}</TableCell>
                    <TableCell className="text-right font-mono">{tx.credit > 0 ? formatCurrency(tx.credit) : ''}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.abs(tx.balance))} <span className="text-xs text-muted-foreground">{tx.balance >= 0 ? 'Dr' : 'Cr'}</span></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No cash transactions in this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
