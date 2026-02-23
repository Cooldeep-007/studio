'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Printer } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { mockVouchers, mockLedgers } from '@/lib/data';
import type { Voucher } from '@/lib/types';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const badgeColors: Record<string, string> = {
  Sales: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  Purchase: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  Payment: 'bg-red-100 text-red-800 hover:bg-red-100/80',
  Receipt: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
  Journal: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
  Contra: 'bg-orange-100 text-orange-800 hover:bg-orange-100/80',
  'Debit Note': 'bg-pink-100 text-pink-800 hover:bg-pink-100/80',
  'Credit Note': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80',
};


export default function VoucherViewPage() {
  const params = useParams();
  const router = useRouter();
  const voucherId = params.id as string;

  const voucher: Voucher | undefined = React.useMemo(() => {
    return mockVouchers.find(v => v.id === voucherId);
  }, [voucherId]);

  const ledgerMap = React.useMemo(() => new Map(mockLedgers.map(l => [l.id, l])), []);
  
  if (!voucher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voucher Not Found</CardTitle>
          <CardDescription>The voucher you are looking for does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </CardContent>
      </Card>
    );
  }

  const partyLedgerName = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName : 'N/A';

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vouchers
        </Button>
        <div className="flex gap-2">
            <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Link href={`/vouchers/${voucher.id}/edit`}>
                <Button>
                    <Edit className="mr-2 h-4 w-4" /> Edit Voucher
                </Button>
            </Link>
        </div>
      </div>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="bg-muted/50 p-6">
            <div className="flex justify-between items-start">
                <div>
                    <Badge className={badgeColors[voucher.voucherType]}>{voucher.voucherType}</Badge>
                    <h2 className="text-2xl font-bold mt-2">{voucher.voucherNumber}</h2>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold">{format(new Date(voucher.date), 'dd MMM, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">Voucher Date</p>
                </div>
            </div>
            {voucher.partyLedgerId && (
                <div className="pt-4">
                    <p className="text-sm text-muted-foreground">Party</p>
                    <p className="font-medium">{partyLedgerName}</p>
                </div>
            )}
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">Transaction Details</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {voucher.entries.map((entry, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{ledgerMap.get(entry.ledgerId)?.ledgerName}</TableCell>
                                <TableCell className="text-right font-mono">{entry.type === 'Dr' ? formatCurrency(entry.amount) : ''}</TableCell>
                                <TableCell className="text-right font-mono">{entry.type === 'Cr' ? formatCurrency(entry.amount) : ''}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Separator />
                <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 w-full max-w-xs">
                        <span className="font-semibold">Total Debit</span>
                        <span className="text-right font-semibold font-mono">{formatCurrency(voucher.totalDebit)}</span>
                        <span className="font-semibold">Total Credit</span>
                        <span className="text-right font-semibold font-mono">{formatCurrency(voucher.totalCredit)}</span>
                    </div>
                </div>
            </div>
            {voucher.narration && (
                <div className="mt-6">
                    <p className="text-sm font-medium text-muted-foreground">Narration</p>
                    <p className="mt-1 p-3 bg-secondary rounded-md text-sm">{voucher.narration}</p>
                </div>
            )}
        </CardContent>
         <CardFooter className="bg-muted/50 p-4 text-xs text-muted-foreground text-center justify-center">
            <p>Created on {format(new Date(voucher.createdAt), 'PPpp')}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
