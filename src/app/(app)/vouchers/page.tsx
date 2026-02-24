
'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, MoreHorizontal } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/date-range-picker';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { mockVouchers, mockLedgers } from '@/lib/data';
import type { Voucher, VoucherType, VoucherStatus } from '@/lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const badgeColors: Record<string, string> = {
  Sales: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  'Adhoc Sale': 'bg-green-100 text-green-800 hover:bg-green-100/80',
  Purchase: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  'Adhoc Purchase': 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  Payment: 'bg-red-100 text-red-800 hover:bg-red-100/80',
  Receipt: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
  Journal: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
  Contra: 'bg-orange-100 text-orange-800 hover:bg-orange-100/80',
  'Debit Note': 'bg-pink-100 text-pink-800 hover:bg-pink-100/80',
  'Credit Note': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80',
  'Proforma Invoice': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80',
};

const statusBadgeColors: Record<VoucherStatus, string> = {
  Paid: 'bg-green-100 text-green-800',
  Partial: 'bg-yellow-100 text-yellow-800',
  Unpaid: 'bg-red-100 text-red-800',
  Cancelled: 'bg-gray-100 text-gray-800',
};


const voucherTypesForFilter: string[] = ['All', 'Sales', 'Purchase', 'Payment', 'Receipt', 'Debit Note', 'Credit Note', 'Journal', 'Contra', 'Adhoc Sale', 'Adhoc Purchase'];

export default function VouchersPage() {
  const router = useRouter();
  const [voucherTypeFilter, setVoucherTypeFilter] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState('');
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
    
    // 3. Filter by search query
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        vouchers = vouchers.filter(v => {
            const partyName = v.partyLedgerId ? ledgerMap.get(v.partyLedgerId)?.toLowerCase() : '';
            return (
                v.voucherNumber.toLowerCase().includes(lowercasedQuery) ||
                (partyName && partyName.includes(lowercasedQuery)) ||
                v.narration.toLowerCase().includes(lowercasedQuery) ||
                v.totalDebit.toString().includes(lowercasedQuery)
            );
        });
    }
    
    // Sort by date descending
    return vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [date, voucherTypeFilter, searchQuery, ledgerMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Voucher Register</h1>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <DateRangePicker date={date} setDate={setDate} />
            <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Voucher Type" />
                </SelectTrigger>
                <SelectContent>
                    {voucherTypesForFilter.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
            </Select>
            <div className="relative flex-grow">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                    placeholder="Search by No, Party, Narration..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
            </div>
             <Link href="/vouchers/create">
                <Button className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Voucher
                </Button>
            </Link>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voucher Entries</CardTitle>
          <CardDescription>
            A list of all recorded accounting vouchers for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredVouchers.length > 0 ? (
                    filteredVouchers.map((voucher) => (
                        <TableRow key={voucher.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>{format(new Date(voucher.date), 'dd-MMM-yyyy')}</TableCell>
                            <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                            <TableCell><Badge className={badgeColors[voucher.voucherType] || 'bg-secondary text-secondary-foreground'}>{voucher.voucherType}</Badge></TableCell>
                            <TableCell>{ledgerMap.get(voucher.partyLedgerId || '') || '-'}</TableCell>
                            <TableCell>
                              {voucher.status && <Badge className={cn(statusBadgeColors[voucher.status])}>{voucher.status}</Badge>}
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(voucher.totalDebit)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/vouchers/${voucher.id}`)}>
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/vouchers/${voucher.id}/edit`)}>
                                    Edit
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                     <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No vouchers found for the selected criteria.
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
