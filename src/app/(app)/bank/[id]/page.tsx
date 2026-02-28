'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { ArrowDown, ArrowUp, Banknote, Landmark, Scale, PlusCircle, Wallet, FileInput, Repeat, ArrowRightLeft, HandCoins, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Voucher, Ledger, Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function BankStatementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { profile } = useUser();
  const { firestore } = useFirebase();

  const accountLedgerId = params.id as string;
  const companyId = searchParams.get('companyId');
  const [isExporting, setIsExporting] = React.useState(false);
  
  const [date, setDate] = React.useState<DateRange | undefined>();

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId) return null;
    return doc(firestore, 'firms', profile.firmId, 'companies', companyId);
  }, [firestore, profile?.firmId, companyId]);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  React.useEffect(() => {
    if (company && !date) {
        const fyStartDate = company.financialYearStart instanceof Date ? company.financialYearStart : (company.financialYearStart as any).toDate();
        const fyEndDate = new Date(fyStartDate.getFullYear() + 1, 2, 31);
        setDate({ from: fyStartDate, to: fyEndDate });
    }
  }, [company, date]);

  const accountLedgerRef = useMemoFirebase(() => {
      if (!firestore || !profile?.firmId || !companyId || !accountLedgerId) return null;
      return doc(firestore, 'firms', profile.firmId, 'companies', companyId, 'ledgers', accountLedgerId);
  }, [firestore, profile?.firmId, companyId, accountLedgerId]);
  const { data: accountLedger, isLoading: isLoadingLedger } = useDoc<Ledger>(accountLedgerRef);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers');
  }, [firestore, profile?.firmId, companyId]);
  const { data: vouchers, isLoading: isLoadingVouchers } = useCollection<Voucher>(vouchersQuery);
  
  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', companyId, 'ledgers');
  }, [firestore, profile?.firmId, companyId]);
  const { data: ledgers, isLoading: isLoadingLedgers } = useCollection<Ledger>(ledgersQuery);
  
  const ledgerMap = React.useMemo(() => new Map(ledgers?.map((l) => [l.id, l])), [ledgers]);

  const transactions = React.useMemo(() => {
    if (!accountLedger || !vouchers) return [];

    const relevantVouchers = vouchers
      .filter((v) => {
        const voucherDate = v.date instanceof Date ? v.date : (v.date as any).toDate();
        return (
          (!date?.from || voucherDate >= date.from) &&
          (!date?.to || voucherDate <= date.to) &&
          v.entries.some((li) => li.ledgerId === accountLedger.id)
        );
      })
      .map((v) => {
        const accountEntry = v.entries.find((li) => li.ledgerId === accountLedger.id)!;
        const otherEntry = v.entries.find((li) => li.ledgerId !== accountLedger.id);
        
        const debit = accountEntry.type === 'Dr' ? accountEntry.amount : 0;
        const credit = accountEntry.type === 'Cr' ? accountEntry.amount : 0;

        return {
          ...v,
          date: v.date instanceof Date ? v.date : (v.date as any).toDate(),
          debit,
          credit,
          particulars: ledgerMap.get(otherEntry?.ledgerId || '')?.ledgerName || v.narration || 'Journal Adjustment',
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningBalance = (accountLedger.openingBalance || 0) * (accountLedger.balanceType === 'Cr' ? -1 : 1);
    
    return relevantVouchers.map((tx) => {
      runningBalance += tx.debit - tx.credit;
      return { ...tx, balance: runningBalance };
    });
  }, [accountLedger, vouchers, date, ledgerMap]);

  const openingBalance = accountLedger ? (accountLedger.openingBalance || 0) * (accountLedger.balanceType === 'Cr' ? -1 : 1) : 0;
  const totalInflow = transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalOutflow = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const closingBalance = openingBalance + totalInflow - totalOutflow;

  const handleExport = (formatType: 'pdf' | 'xlsx') => {
    setIsExporting(true);
    toast({ title: "Exporting...", description: `Preparing your ${formatType.toUpperCase()} file.` });

    try {
        if (formatType === 'pdf') {
            exportToPdf();
        } else {
            exportToExcel();
        }
        toast({ title: "Export Successful", description: "Your file has been downloaded." });
    } catch (e) {
        toast({ variant: 'destructive', title: "Export Failed", description: "An error occurred during export." });
    } finally {
        setIsExporting(false);
    }
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.text(`${accountLedger?.ledgerName} Statement`, 14, 15);
    doc.text(`Period: ${date?.from ? format(date.from, 'PP') : ''} to ${date?.to ? format(date.to, 'PP') : ''}`, 14, 22);

    (doc as any).autoTable({
        startY: 30,
        head: [['Date', 'Particulars', 'Voucher Type', 'Voucher No', 'Debit', 'Credit', 'Balance']],
        body: transactions.map(tx => [
            format(tx.date, 'dd-MMM-yy'),
            tx.particulars,
            tx.voucherType,
            tx.voucherNumber,
            tx.debit > 0 ? formatCurrency(tx.debit) : '',
            tx.credit > 0 ? formatCurrency(tx.credit) : '',
            `${formatCurrency(Math.abs(tx.balance))} ${tx.balance >= 0 ? 'Dr' : 'Cr'}`
        ]),
        foot: [
            ['', 'Closing Balance', '', '', '', '', `${formatCurrency(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`]
        ],
        footStyles: { fontStyle: 'bold' }
    });
    doc.save(`${accountLedger?.ledgerName}_Statement.pdf`);
  };

  const exportToExcel = () => {
    const ws_data = [
        [`${accountLedger?.ledgerName} Statement`],
        [`Period: ${date?.from ? format(date.from, 'PP') : ''} to ${date?.to ? format(date.to, 'PP') : ''}`],
        [],
        ['Date', 'Particulars', 'Voucher Type', 'Voucher No', 'Debit', 'Credit', 'Balance']
    ];
    transactions.forEach(tx => {
        ws_data.push([
            format(tx.date, 'dd-MM-yyyy'),
            tx.particulars,
            tx.voucherType,
            tx.voucherNumber,
            tx.debit > 0 ? tx.debit : '',
            tx.credit > 0 ? tx.credit : '',
            `${Math.abs(tx.balance).toFixed(2)} ${tx.balance >= 0 ? 'Dr' : 'Cr'}`
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statement');
    XLSX.writeFile(wb, `${accountLedger?.ledgerName}_Statement.xlsx`);
  };

  if (isLoadingLedger || isLoadingVouchers || isLoadingLedgers || isLoadingCompany) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  if (!accountLedger) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Not Found</CardTitle>
          <CardDescription>The requested cash or bank account could not be found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBank = accountLedger.isBankAccount;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {isBank ? <Landmark className="h-8 w-8 text-primary" /> : <Wallet className="h-8 w-8 text-primary" />}
            {accountLedger.ledgerName}
          </h1>
          <p className="text-muted-foreground">{isBank ? 'Bank Statement' : 'Cash Book'}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExport('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
             <Link href={`/vouchers/create?context=${isBank ? 'bank' : 'cash'}&companyId=${companyId}`}>
                <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </Link>
        </div>
      </div>
      
      <DateRangePicker date={date} setDate={setDate} company={company} />

       <div className="flex justify-end gap-2">
            {isBank ? (
                <>
                    <Button variant="outline" disabled><FileInput className="mr-2 h-4 w-4" /> Import Bank Statement</Button>
                    <Button variant="outline" disabled><Repeat className="mr-2 h-4 w-4" /> Reconcile</Button>
                </>
            ) : (
                 <>
                    <Button variant="outline" disabled><ArrowRightLeft className="mr-2 h-4 w-4" /> Cash Transfer</Button>
                    <Button variant="outline" disabled><HandCoins className="mr-2 h-4 w-4" /> Cash Replenishment</Button>
                </>
            )}
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
            <CardTitle className="text-sm font-medium">{isBank ? 'Total Debits (In)' : 'Total Cash In'}</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isBank ? 'Total Credits (Out)' : 'Total Cash Out'}</CardTitle>
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
            {isBank ? <Banknote className="h-4 w-4 text-muted-foreground" /> : <Wallet className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.abs(closingBalance))} <span className="text-sm font-medium text-muted-foreground">{closingBalance >= 0 ? 'Dr' : 'Cr'}</span></div>
            <p className="text-xs text-muted-foreground">As of {date?.to ? format(date.to, 'PPP') : 'today'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Detailed view of all {isBank ? 'bank' : 'cash'} transactions for the selected period.
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
                    No {isBank ? 'bank' : 'cash'} transactions in this period.
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
