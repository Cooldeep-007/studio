
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from 'lucide-react';
import { DateRangePicker } from "@/components/date-range-picker";
import { mockLedgers, mockVouchers } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Voucher, Ledger } from "@/lib/types";

type TrialBalanceRow = {
  name: string;
  group: string;
  debit: number;
  credit: number;
};

type TrialBalanceReport = {
  data: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  reportDate: Date;
};

type VoucherRegisterRow = {
    date: Date;
    particulars: string;
    vchType: string;
    vchNo: string;
    debit: number;
    credit: number;
    isSubEntry?: boolean;
}

type VoucherRegisterReport = {
    rows: VoucherRegisterRow[];
    totalDebit: number;
    totalCredit: number;
    period: { from: Date; to: Date };
}

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState<string>("");
  const [date, setDate] = React.useState<DateRange | undefined>({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [trialBalanceData, setTrialBalanceData] = React.useState<TrialBalanceReport | null>(null);
  const [voucherRegisterData, setVoucherRegisterData] = React.useState<VoucherRegisterReport | null>(null);


  const handleGenerateReport = () => {
    if (!date?.to || !date?.from) return;

    setTrialBalanceData(null);
    setVoucherRegisterData(null);

    if (reportType === 'trial-balance') {
        const trialBalanceData = mockLedgers.map(ledger => ({
            name: ledger.ledgerName,
            group: ledger.group,
            debit: ledger.balanceType === 'Dr' ? ledger.currentBalance : 0,
            credit: ledger.balanceType === 'Cr' ? ledger.currentBalance : 0,
        }));

        const totalDebit = trialBalanceData.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = trialBalanceData.reduce((sum, item) => sum + item.credit, 0);

        setTrialBalanceData({
            data: trialBalanceData,
            totalDebit,
            totalCredit,
            reportDate: date.to,
        });
    }

    if (reportType === 'voucher-register') {
        const filteredVouchers = mockVouchers.filter(v => {
            const voucherDate = new Date(v.date);
            return voucherDate >= date!.from! && voucherDate <= date!.to!;
        });

        filteredVouchers.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.voucherNumber.localeCompare(b.voucherNumber);
        });

        const ledgerMap = new Map(mockLedgers.map(l => [l.id, l]));
        const companyState = "Karnataka"; 

        let reportRows: VoucherRegisterRow[] = [];

        for (const voucher of filteredVouchers) {
            const partyLedger = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId) : undefined;
            if (!partyLedger && voucher.voucherType !== 'Journal') continue;

            const baseEntry = {
                date: new Date(voucher.date),
                vchType: voucher.voucherType,
                vchNo: voucher.voucherNumber,
            };

            const salesLedger = ledgerMap.get('led-01'); // Domestic Sales
            const purchaseLedger = ledgerMap.get('led-purchase-account');
            const salesReturnLedger = ledgerMap.get('led-sales-return');
            const purchaseReturnLedger = ledgerMap.get('led-purchase-return');

            const findEntry = (type: 'Dr' | 'Cr', excludedLedgers: string[]) => voucher.entries.find(e => e.type === type && !excludedLedgers.includes(e.ledgerId));

            switch(voucher.voucherType) {
                case 'Sales': {
                    reportRows.push({ ...baseEntry, particulars: partyLedger!.ledgerName, debit: voucher.totalDebit, credit: 0 });
                    
                    const salesEntry = voucher.entries.find(e => e.type === 'Cr' && e.ledgerId === salesLedger?.id);
                    if(salesEntry && salesLedger) reportRows.push({ ...baseEntry, particulars: `To ${salesLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: salesEntry.amount });

                    const taxEntries = voucher.entries.filter(e => e.type === 'Cr' && e.ledgerId !== salesLedger?.id);
                    taxEntries.forEach(tax => {
                        const taxLedger = ledgerMap.get(tax.ledgerId);
                        if(taxLedger) reportRows.push({ ...baseEntry, particulars: `To ${taxLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: tax.amount });
                    });
                    break;
                }
                case 'Purchase': {
                    const purchaseEntry = voucher.entries.find(e => e.type === 'Dr' && e.ledgerId === purchaseLedger?.id);
                    if (purchaseEntry && purchaseLedger) reportRows.push({ ...baseEntry, particulars: purchaseLedger.ledgerName, debit: purchaseEntry.amount, credit: 0 });

                    const taxEntries = voucher.entries.filter(e => e.type === 'Dr' && e.ledgerId !== purchaseLedger?.id);
                    taxEntries.forEach(tax => {
                        const taxLedger = ledgerMap.get(tax.ledgerId);
                        if (taxLedger) reportRows.push({ ...baseEntry, particulars: `By ${taxLedger.ledgerName}`, debit: tax.amount, credit: 0 });
                    });
                    
                    if (partyLedger) reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalCredit });
                    break;
                }
                case 'Payment': {
                    const creditEntry = findEntry('Cr', []);
                    const bankCashLedger = creditEntry ? ledgerMap.get(creditEntry.ledgerId) : undefined;
                    reportRows.push({ ...baseEntry, particulars: partyLedger!.ledgerName, debit: voucher.totalDebit, credit: 0 });
                    if(bankCashLedger) {
                        reportRows.push({ ...baseEntry, particulars: `To ${bankCashLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalCredit });
                    }
                    break;
                }
                case 'Receipt': {
                    const debitEntry = findEntry('Dr', []);
                    const bankCashLedger = debitEntry ? ledgerMap.get(debitEntry.ledgerId) : undefined;
                     if(bankCashLedger) {
                        reportRows.push({ ...baseEntry, particulars: bankCashLedger.ledgerName, debit: voucher.totalDebit, credit: 0 });
                     }
                     if (partyLedger) reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalCredit });
                     break;
                }
                case 'Journal':
                case 'Contra': {
                    voucher.entries.forEach((item, index) => {
                       const itemLedger = ledgerMap.get(item.ledgerId);
                       if (itemLedger) {
                            const isFirstDr = item.type === 'Dr' && !voucher.entries.slice(0, index).some(e => e.type === 'Dr');
                            const prefix = item.type === 'Dr' ? (isFirstDr ? '' : 'By ') : 'To ';
                            reportRows.push({ 
                                ...baseEntry, 
                                particulars: `${prefix}${itemLedger.ledgerName}`,
                                debit: item.type === 'Dr' ? item.amount : 0, 
                                credit: item.type === 'Cr' ? item.amount : 0,
                                isSubEntry: !isFirstDr
                            });
                       }
                    });
                    break;
                }
                case 'Credit Note': {
                    const salesReturnEntry = voucher.entries.find(e => e.type === 'Dr' && e.ledgerId === salesReturnLedger?.id);
                    if(salesReturnEntry && salesReturnLedger) {
                        reportRows.push({ ...baseEntry, particulars: salesReturnLedger.ledgerName, debit: salesReturnEntry.amount, credit: 0 });
                    }
                    const taxEntries = voucher.entries.filter(e => e.type === 'Dr' && e.ledgerId !== salesReturnLedger?.id);
                    taxEntries.forEach(tax => {
                        const taxLedger = ledgerMap.get(tax.ledgerId);
                        if (taxLedger) reportRows.push({ ...baseEntry, particulars: `By ${taxLedger.ledgerName}`, debit: tax.amount, credit: 0 });
                    });
                    
                    if (partyLedger) reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalCredit });
                    break;
                }
                 case 'Debit Note': {
                    reportRows.push({ ...baseEntry, particulars: partyLedger!.ledgerName, debit: voucher.totalDebit, credit: 0 });

                    const purchaseReturnEntry = voucher.entries.find(e => e.type === 'Cr' && e.ledgerId === purchaseReturnLedger?.id);
                    if (purchaseReturnEntry && purchaseReturnLedger) {
                        reportRows.push({ ...baseEntry, particulars: `To ${purchaseReturnLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: purchaseReturnEntry.amount });
                    }
                    const taxEntries = voucher.entries.filter(e => e.type === 'Cr' && e.ledgerId !== purchaseReturnLedger?.id);
                    taxEntries.forEach(tax => {
                        const taxLedger = ledgerMap.get(tax.ledgerId);
                        if(taxLedger) reportRows.push({ ...baseEntry, particulars: `To ${taxLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: tax.amount });
                    });
                    break;
                }
            }
        }
        
        const totalDebit = reportRows.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = reportRows.reduce((sum, item) => sum + (item.credit || 0), 0);
        
        setVoucherRegisterData({ rows: reportRows, totalDebit, totalCredit, period: { from: date.from, to: date.to } });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select filters to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-grow sm:flex-grow-0">
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="voucher-register">Voucher Register</SelectItem>
                    <SelectItem value="trial-balance">Trial Balance</SelectItem>
                    <SelectItem value="pnl">Profit & Loss</SelectItem>
                    <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <DateRangePicker date={date} setDate={setDate} className="flex-grow" />
            <Button className="w-full sm:w-auto" onClick={handleGenerateReport} disabled={!reportType || !date}>
              <Filter className="mr-2 h-4 w-4" />
              View Report
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportType === 'voucher-register' && voucherRegisterData && (
        <Card>
            <CardHeader>
                <CardTitle>Voucher Register</CardTitle>
                <CardDescription>For the period from {format(voucherRegisterData.period.from, 'PPP')} to {format(voucherRegisterData.period.to, 'PPP')}</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Vch Type</TableHead>
                    <TableHead>Vch No.</TableHead>
                    <TableHead className="text-right">Debit Amount</TableHead>
                    <TableHead className="text-right">Credit Amount</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {voucherRegisterData.rows.map((row, index) => (
                    <TableRow key={index}>
                        <TableCell>{row.isSubEntry ? '' : format(row.date, 'dd-MMM-yyyy')}</TableCell>
                        <TableCell className={cn(row.isSubEntry && "pl-8 text-muted-foreground")}>{row.particulars}</TableCell>
                        <TableCell>{row.isSubEntry ? '' : row.vchType}</TableCell>
                        <TableCell>{row.isSubEntry ? '' : row.vchNo}</TableCell>
                        <TableCell className="text-right font-mono">{row.debit > 0 ? formatCurrency(row.debit) : ''}</TableCell>
                        <TableCell className="text-right font-mono">{row.credit > 0 ? formatCurrency(row.credit) : ''}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="font-bold text-base bg-muted/50">
                        <TableCell colSpan={4} className="text-right">Total</TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(voucherRegisterData.totalDebit)}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono", Math.abs(voucherRegisterData.totalDebit - voucherRegisterData.totalCredit) > 0.01 && "text-destructive")}>
                            {formatCurrency(voucherRegisterData.totalCredit)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            </CardContent>
        </Card>
      )}

      {reportType === 'trial-balance' && trialBalanceData && (
        <Card>
            <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>As of {trialBalanceData.reportDate.toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Debit (Dr)</TableHead>
                    <TableHead className="text-right">Credit (Cr)</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {trialBalanceData.data.map((item) => (
                    <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">
                        {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                        {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="font-bold text-base">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(trialBalanceData.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(trialBalanceData.totalCredit)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
