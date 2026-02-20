
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
            const partyLedger = ledgerMap.get(voucher.partyLedger);
            if (!partyLedger) continue;

            const baseEntry = {
                date: new Date(voucher.date),
                vchType: voucher.voucherType,
                vchNo: voucher.voucherNumber,
            };

            switch(voucher.voucherType) {
                case 'Sales': {
                    const lineItem = voucher.lineItems[0];
                    const salesLedger = ledgerMap.get(lineItem.ledgerId);
                    reportRows.push({ ...baseEntry, particulars: partyLedger.ledgerName, debit: voucher.totalAmount, credit: 0 });
                    if (salesLedger) {
                        reportRows.push({ ...baseEntry, particulars: `To ${salesLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: lineItem.amount });
                    }
                    if (lineItem.taxAmount && lineItem.taxAmount > 0) {
                        const partyState = partyLedger.contactDetails?.state || companyState;
                        if (partyState === companyState) {
                            reportRows.push({ ...baseEntry, particulars: 'To Output CGST', isSubEntry: true, debit: 0, credit: lineItem.taxAmount / 2 });
                            reportRows.push({ ...baseEntry, particulars: 'To Output SGST', isSubEntry: true, debit: 0, credit: lineItem.taxAmount / 2 });
                        } else {
                            reportRows.push({ ...baseEntry, particulars: 'To Output IGST', isSubEntry: true, debit: 0, credit: lineItem.taxAmount });
                        }
                    }
                    break;
                }
                case 'Purchase': {
                    const lineItem = voucher.lineItems[0];
                    const purchaseLedger = ledgerMap.get('led-purchase-account');
                    if (purchaseLedger) {
                         reportRows.push({ ...baseEntry, particulars: purchaseLedger.ledgerName, debit: lineItem.amount, credit: 0 });
                    }
                    if (lineItem.taxAmount && lineItem.taxAmount > 0) {
                        const partyState = partyLedger.contactDetails?.state || companyState;
                        if (partyState === companyState) {
                             reportRows.push({ ...baseEntry, particulars: 'By Input CGST', debit: lineItem.taxAmount/2, credit: 0 });
                             reportRows.push({ ...baseEntry, particulars: 'By Input SGST', debit: lineItem.taxAmount/2, credit: 0 });
                        } else {
                             reportRows.push({ ...baseEntry, particulars: 'By Input IGST', debit: lineItem.taxAmount, credit: 0 });
                        }
                    }
                     reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalAmount });
                    break;
                }
                case 'Payment': {
                    const bankCashLedger = ledgerMap.get(voucher.lineItems[0].ledgerId);
                    reportRows.push({ ...baseEntry, particulars: partyLedger.ledgerName, debit: voucher.totalAmount, credit: 0 });
                    if(bankCashLedger) {
                        reportRows.push({ ...baseEntry, particulars: `To ${bankCashLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalAmount });
                    }
                    break;
                }
                case 'Receipt': {
                    const bankCashLedger = ledgerMap.get(voucher.lineItems[0].ledgerId);
                     if(bankCashLedger) {
                        reportRows.push({ ...baseEntry, particulars: bankCashLedger.ledgerName, debit: voucher.totalAmount, credit: 0 });
                     }
                     reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalAmount });
                     break;
                }
                case 'Journal': {
                    let firstDrDone = false;
                    voucher.lineItems.forEach(item => {
                       const itemLedger = ledgerMap.get(item.ledgerId);
                       if (itemLedger) {
                            if (item.type === 'Dr' && !firstDrDone) {
                                reportRows.push({ ...baseEntry, particulars: itemLedger.ledgerName, debit: item.amount, credit: 0 });
                                firstDrDone = true;
                            } else if (item.type === 'Dr') {
                                reportRows.push({ ...baseEntry, particulars: `By ${itemLedger.ledgerName}`, debit: item.amount, credit: 0 });
                            } else {
                                reportRows.push({ ...baseEntry, particulars: `To ${itemLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: item.amount });
                            }
                       }
                    });
                    break;
                }
                case 'Credit Note': {
                    const lineItem = voucher.lineItems[0];
                    const salesReturnLedger = ledgerMap.get('led-sales-return');
                     if(salesReturnLedger) {
                        reportRows.push({ ...baseEntry, particulars: salesReturnLedger.ledgerName, debit: lineItem.amount, credit: 0 });
                    }
                     if (lineItem.taxAmount && lineItem.taxAmount > 0) {
                        const partyState = partyLedger.contactDetails?.state || companyState;
                        if (partyState === companyState) {
                            reportRows.push({ ...baseEntry, particulars: 'By Output CGST', debit: lineItem.taxAmount/2, credit: 0 });
                            reportRows.push({ ...baseEntry, particulars: 'By Output SGST', debit: lineItem.taxAmount/2, credit: 0 });
                        } else {
                            reportRows.push({ ...baseEntry, particulars: 'By Output IGST', debit: lineItem.taxAmount, credit: 0 });
                        }
                    }
                    reportRows.push({ ...baseEntry, particulars: `To ${partyLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: voucher.totalAmount });
                    break;
                }
                 case 'Debit Note': {
                    const lineItem = voucher.lineItems[0];
                    const purchaseReturnLedger = ledgerMap.get('led-purchase-return');
                    reportRows.push({ ...baseEntry, particulars: partyLedger.ledgerName, debit: voucher.totalAmount, credit: 0 });

                    if (purchaseReturnLedger) {
                        reportRows.push({ ...baseEntry, particulars: `To ${purchaseReturnLedger.ledgerName}`, isSubEntry: true, debit: 0, credit: lineItem.amount });
                    }
                    if (lineItem.taxAmount && lineItem.taxAmount > 0) {
                        const partyState = partyLedger.contactDetails?.state || companyState;
                        if (partyState === companyState) {
                            reportRows.push({ ...baseEntry, particulars: 'To Input CGST Reversal', isSubEntry: true, debit: 0, credit: lineItem.taxAmount / 2 });
                            reportRows.push({ ...baseEntry, particulars: 'To Input SGST Reversal', isSubEntry: true, debit: 0, credit: lineItem.taxAmount / 2 });
                        } else {
                            reportRows.push({ ...baseEntry, particulars: 'To Input IGST Reversal', isSubEntry: true, debit: 0, credit: lineItem.taxAmount });
                        }
                    }
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
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
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
            <DateRangePicker date={date} setDate={setDate} />
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
                        <TableCell>{format(row.date, 'dd-MMM-yyyy')}</TableCell>
                        <TableCell className={cn(row.isSubEntry && "pl-8 text-muted-foreground")}>{row.particulars}</TableCell>
                        <TableCell>{row.vchType}</TableCell>
                        <TableCell>{row.vchNo}</TableCell>
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

    