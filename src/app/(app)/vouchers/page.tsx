'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from "react-day-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DateRangePicker } from '@/components/date-range-picker';

import { mockVouchers, mockLedgers } from '@/lib/data';
import type { Voucher, VoucherType } from '@/lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
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
  'Adhoc Invoice': 'bg-teal-100 text-teal-800 hover:bg-teal-100/80',
  'Proforma Invoice': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80',
};

const voucherTypesForFilter: string[] = ['All', 'Sales', 'Purchase', 'Debit Note', 'Credit Note', 'Journal', 'Adhoc Invoice', 'Proforma Invoice'];

export default function VouchersPage() {
  const [voucherTypeFilter, setVoucherTypeFilter] = React.useState<string>('All');
  const [date, setDate] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
  });
  const ledgerMap = React.useMemo(() => new Map(mockLedgers.map(l => [l.id, l.ledgerName])), []);

  const filteredVouchers = React.useMemo(() => {
    let vouchers = mockVouchers;

    // 1. Filter by date
    if (date?.from && date?.to) {
        vouchers = vouchers.filter(v => {
            const voucherDate = new Date(v.date);
            return voucherDate >= date.from! && voucherDate <= date.to!;
        });
    }

    // 2. Filter by voucher type
    if (voucherTypeFilter !== 'All') {
        vouchers = vouchers.filter(v => v.voucherType === voucherTypeFilter);
    }
    
    return vouchers;
  }, [date, voucherTypeFilter]);

  const groupedVouchers = React.useMemo(() => {
    return filteredVouchers.reduce(
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
  }, [filteredVouchers]);
  
  const sortedGroupKeys = React.useMemo(() => {
    const keys = Object.keys(groupedVouchers);
    const voucherTypeOrder: VoucherType[] = ['Sales', 'Purchase', 'Receipt', 'Payment', 'Journal', 'Contra', 'Debit Note', 'Credit Note'];
    return keys.sort((a, b) => {
        const aIndex = voucherTypeOrder.indexOf(a as VoucherType);
        const bIndex = voucherTypeOrder.indexOf(b as VoucherType);
        return (aIndex > -1 ? aIndex : 99) - (bIndex > -1 ? bIndex : 99);
    });
  }, [groupedVouchers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Vouchers</h1>
        <div className="flex flex-col md:flex-row items-center gap-2">
            <DateRangePicker date={date} setDate={setDate} />
            <div className="flex w-full md:w-auto items-center gap-2">
                 <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Voucher Type" />
                    </SelectTrigger>
                    <SelectContent>
                       {voucherTypesForFilter.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Link href="/vouchers/create">
                <Button className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create
                </Button>
                </Link>
            </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voucher Entries</CardTitle>
          <CardDescription>
            A list of all recorded accounting vouchers for the selected period and type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedVouchers).length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue={`${sortedGroupKeys[0]}-item`}>
              {sortedGroupKeys.map((key) => {
                const vouchers = groupedVouchers[key];
                const totalAmount = vouchers.reduce(
                  (sum, v) => sum + v.totalDebit,
                  0
                );
                const sortedVouchers = [...vouchers].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                return (
                  <AccordionItem value={`${key}-item`} key={key}>
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 rounded-md">
                      <div className="flex items-center gap-4">
                        <Badge className={badgeColors[key as VoucherType] || 'bg-secondary text-secondary-foreground'}>
                          {key}
                        </Badge>
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
                              <TableCell>{format(new Date(voucher.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                               <TableCell>
                                 {ledgerMap.get(voucher.partyLedgerId || '') || voucher.narration}
                               </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(voucher.totalDebit)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="text-right font-bold p-4 border-t">
                          Total {key} Amount: {formatCurrency(totalAmount)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No voucher entries found for the selected criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
