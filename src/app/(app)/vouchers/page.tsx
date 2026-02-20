'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { mockVouchers } from '@/lib/data';
import type { Voucher, VoucherType } from '@/lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const badgeColors: Record<VoucherType, string> = {
  Sales: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  Purchase: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  Payment: 'bg-red-100 text-red-800 hover:bg-red-100/80',
  Receipt: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
  Journal: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
  Contra: 'bg-orange-100 text-orange-800 hover:bg-orange-100/80',
  'Debit Note': 'bg-pink-100 text-pink-800 hover:bg-pink-100/80',
  'Credit Note': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80',
};


export default function VouchersPage() {
  const groupedVouchers = React.useMemo(() => {
    return mockVouchers.reduce(
      (acc, voucher) => {
        const type = voucher.voucherType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(voucher);
        return acc;
      },
      {} as Record<string, Voucher[]>
    );
  }, []);
  
  const voucherTypeOrder: VoucherType[] = ['Sales', 'Purchase', 'Receipt', 'Payment', 'Journal', 'Contra', 'Debit Note', 'Credit Note'];

  const sortedGroupKeys = Object.keys(groupedVouchers).sort((a, b) => {
      const aIndex = voucherTypeOrder.indexOf(a as VoucherType);
      const bIndex = voucherTypeOrder.indexOf(b as VoucherType);
      return (aIndex > -1 ? aIndex : 99) - (bIndex > -1 ? bIndex : 99);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vouchers</h1>
        <Link href="/vouchers/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Voucher
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voucher Entries</CardTitle>
          <CardDescription>
            A list of all recorded accounting vouchers, grouped by type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedVouchers).length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue={`${sortedGroupKeys[0]}-item`}>
              {sortedGroupKeys.map((type) => {
                const vouchers = groupedVouchers[type];
                const totalAmount = vouchers.reduce(
                  (sum, v) => sum + v.totalAmount,
                  0
                );
                const sortedVouchers = [...vouchers].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                return (
                  <AccordionItem value={`${type}-item`} key={type}>
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 rounded-md">
                      <div className="flex items-center gap-4">
                        <Badge className={badgeColors[type as VoucherType] || 'bg-secondary text-secondary-foreground'}>
                          {type}
                        </Badge>
                        <span className="font-semibold text-lg">{type}</span>
                        <span className="text-muted-foreground">({vouchers.length} vouchers)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-2">
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/4">Date</TableHead>
                            <TableHead className="w-1/4">Voucher No.</TableHead>
                            <TableHead className="w-1/4">Party</TableHead>
                            <TableHead className="text-right w-1/4">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedVouchers.map((voucher) => (
                            <TableRow key={voucher.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                               <TableCell>{voucher.partyLedger}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(voucher.totalAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="text-right font-bold p-4 border-t">
                          Total {type} Amount: {formatCurrency(totalAmount)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No voucher entries found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
