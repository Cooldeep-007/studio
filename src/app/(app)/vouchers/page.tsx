'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, MoreHorizontal, Loader2, Building } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
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
} from '@/components/ui/select';
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
import type { Voucher, VoucherType, VoucherStatus, Company, Ledger } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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

const voucherTypesForFilter: string[] = [
  'All',
  'Sales',
  'Purchase',
  'Payment',
  'Receipt',
  'Debit Note',
  'Credit Note',
  'Journal',
  'Contra',
  'Adhoc Sale',
  'Adhoc Purchase',
];

export default function VouchersPage() {
  const router = useRouter();
  const { profile } = useUser();
  const { firestore } = useFirebase();

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>();
  const [voucherTypeFilter, setVoucherTypeFilter] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  });

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId) return null;
    return query(collection(firestore, 'firms', profile.firmId, 'companies'), where('status', '==', 'Active'));
  }, [firestore, profile?.firmId]);

  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);

  React.useEffect(() => {
    if (!selectedCompanyId && companies && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !selectedCompanyId || !date?.from || !date?.to) return null;
    return query(
        collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'vouchers'),
        where('date', '>=', date.from),
        where('date', '<=', date.to)
    );
  }, [firestore, profile?.firmId, selectedCompanyId, date]);

  const { data: vouchersData, isLoading: isLoadingVouchers } = useCollection<Voucher>(vouchersQuery);

  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
  }, [firestore, profile?.firmId, selectedCompanyId]);
  
  const { data: ledgers, isLoading: isLoadingLedgers } = useCollection<Ledger>(ledgersQuery);
  const ledgerMap = React.useMemo(() => {
    if (!ledgers) return new Map();
    return new Map(ledgers.map(l => [l.id, l.ledgerName]));
  }, [ledgers]);

  const filteredVouchers = React.useMemo(() => {
    let vouchers = vouchersData || [];

    if (voucherTypeFilter !== 'All') {
      vouchers = vouchers.filter(v => v.voucherType === voucherTypeFilter);
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      vouchers = vouchers.filter(v => {
        const partyName = v.partyLedgerId ? ledgerMap.get(v.partyLedgerId)?.toLowerCase() : '';
        const voucherDate = v.date instanceof Date ? v.date : (v.date as any)?.toDate();
        return (
          v.voucherNumber.toLowerCase().includes(lowercasedQuery) ||
          (partyName && partyName.includes(lowercasedQuery)) ||
          (v.narration && v.narration.toLowerCase().includes(lowercasedQuery)) ||
          v.totalDebit.toString().includes(lowercasedQuery) ||
          format(voucherDate, 'dd-MMM-yyyy').toLowerCase().includes(lowercasedQuery)
        );
      });
    }

    return vouchers.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : (a.date as any)?.toDate().getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : (b.date as any)?.toDate().getTime();
        return dateB - dateA;
    });
  }, [vouchersData, voucherTypeFilter, searchQuery, ledgerMap]);

  const isLoading = isLoadingCompanies || isLoadingVouchers || isLoadingLedgers;

  if (!isLoadingCompanies && (!companies || companies.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Voucher Register</h1>
        </div>
        <Card className="text-center">
          <CardHeader>
              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                <Building className="h-8 w-8 text-primary" />
              </div>
            <CardTitle className="mt-4">No Active Company Found</CardTitle>
            <CardDescription>
              To create or view vouchers, you first need to create a company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/companies">
                <PlusCircle className="mr-2 h-4 w-4" /> Go to Companies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Voucher Register</h1>
        <Link href={`/vouchers/create?companyId=${selectedCompanyId}`}>
          <Button className="w-full md:w-auto" disabled={!selectedCompanyId}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Voucher
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {companies && companies.length > 1 && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select Company" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <DateRangePicker date={date} setDate={setDate} />
          <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Voucher Type" /></SelectTrigger>
            <SelectContent>{voucherTypesForFilter.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by No, Party, Narration..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voucher Entries</CardTitle>
          <CardDescription>A list of all recorded accounting vouchers for the selected period.</CardDescription>
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
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => {
                    const voucherDate = voucher.date instanceof Date ? voucher.date : (voucher.date as any)?.toDate();
                    return (
                        <TableRow key={voucher.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>{format(voucherDate, 'dd-MMM-yyyy')}</TableCell>
                            <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                            <TableCell><Badge className={badgeColors[voucher.voucherType] || 'bg-secondary text-secondary-foreground'}>{voucher.voucherType}</Badge></TableCell>
                            <TableCell>{ledgerMap.get(voucher.partyLedgerId || '') || '-'}</TableCell>
                            <TableCell>{voucher.status && <Badge className={cn(statusBadgeColors[voucher.status])}>{voucher.status}</Badge>}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(voucher.totalDebit)}</TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/vouchers/${voucher.id}?companyId=${selectedCompanyId}`)}>View</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/vouchers/${voucher.id}/edit?companyId=${selectedCompanyId}`)}>Edit</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No vouchers found for the selected criteria.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
