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
import { Landmark, PlusCircle } from 'lucide-react';
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
  const bankAccounts = React.useMemo(
    () => mockLedgers.filter((l) => l.group === 'Bank Accounts' && !l.isGroup),
    []
  );

  const bankBalances = React.useMemo(() => {
    const balances = new Map<string, number>();
    bankAccounts.forEach(acc => {
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
  }, [bankAccounts]);


  const totalBankBalance = React.useMemo(
    () => Array.from(bankBalances.values()).reduce((acc, balance) => acc + balance, 0),
    [bankBalances]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bank Accounts</h1>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Bank Account
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Total Bank Balance</CardTitle>
            <CardDescription>
              Combined balance across all your bank accounts.
            </CardDescription>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {formatCurrency(totalBankBalance)}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Bank Accounts</CardTitle>
          <CardDescription>
            A list of all your linked bank accounts. Click on an account to view
            its transaction statement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.length > 0 ? (
                bankAccounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/bank/${account.id}`}
                        className="hover:underline text-primary flex items-center gap-2"
                      >
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                        {account.bankDetails?.bankName || account.ledgerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountType || 'N/A'}
                    </TableCell>
                    <TableCell>{account.bankDetails?.ifscCode || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bankBalances.get(account.id) || 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No bank accounts found.
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
