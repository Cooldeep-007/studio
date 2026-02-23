'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { Landmark, PlusCircle, Wallet } from 'lucide-react';
import { mockLedgers, mockVouchers } from '@/lib/data';
import type { Ledger } from '@/lib/types';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function BankPage() {
  const accounts = React.useMemo(
    () => mockLedgers.filter((l) => (l.group === 'Bank Accounts' || l.ledgerName === 'Cash in Hand') && !l.isGroup),
    []
  );

  const accountBalances = React.useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(acc => {
        const opening = (acc.openingBalance || 0) * (acc.balanceType === 'Cr' ? -1 : 1);
        balances.set(acc.id, opening);
    });

    mockVouchers.forEach(voucher => {
        voucher.entries.forEach(entry => {
            if (balances.has(entry.ledgerId)) {
                let currentBalance = balances.get(entry.ledgerId)!;
                if (entry.type === 'Dr') {
                    currentBalance += entry.amount;
                } else {
                    currentBalance -= entry.amount;
                }
                balances.set(entry.ledgerId, currentBalance);
            }
        });
    });
    return balances;
  }, [accounts]);


  const totalBalance = React.useMemo(
    () => Array.from(accountBalances.values()).reduce((acc, balance) => acc + balance, 0),
    [accountBalances]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cash & Bank</h1>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Account
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Total Cash & Bank Balance</CardTitle>
            <CardDescription>
              Combined balance across all your cash and bank accounts.
            </CardDescription>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {formatCurrency(totalBalance)}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            A list of all your cash and bank accounts. Click on an account to view
            its transaction statement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/bank/${account.id}`}
                        className="hover:underline text-primary flex items-center gap-2"
                      >
                        {account.group === 'Bank Accounts' ? <Landmark className="h-4 w-4 text-muted-foreground" /> : <Wallet className="h-4 w-4 text-muted-foreground" />}
                        {account.bankDetails?.bankName || account.ledgerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountType || (account.ledgerName === 'Cash in Hand' ? 'Cash' : 'N/A')}
                    </TableCell>
                    <TableCell>{account.bankDetails?.ifscCode || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(accountBalances.get(account.id) || 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No cash or bank accounts found.
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
