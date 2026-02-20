"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
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
import { mockLedgers } from "@/lib/data";

type TrialBalanceRow = {
  name: string;
  group: string;
  debit: number;
  credit: number;
};

type ReportData = {
  data: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  reportDate: Date;
};

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState<string>("");
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [reportData, setReportData] = React.useState<ReportData | null>(null);

  const handleGenerateReport = () => {
    if (!date?.to) return;

    if (reportType === 'trial-balance') {
        // This is a simplified calculation for demonstration.
        // A real implementation would process vouchers within the date range.
        const trialBalanceData = mockLedgers.map(ledger => ({
            name: ledger.ledgerName,
            group: ledger.group,
            // For simplicity, we use currentBalance. A real trial balance
            // would calculate closing balance as of the report date.
            debit: ledger.balanceType === 'Dr' ? ledger.currentBalance : 0,
            credit: ledger.balanceType === 'Cr' ? ledger.currentBalance : 0,
        }));

        const totalDebit = trialBalanceData.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = trialBalanceData.reduce((sum, item) => sum + item.credit, 0);

        setReportData({
            data: trialBalanceData,
            totalDebit,
            totalCredit,
            reportDate: date.to,
        });
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial-balance">Trial Balance</SelectItem>
                <SelectItem value="pnl" disabled>Profit & Loss</SelectItem>
                <SelectItem value="balance-sheet" disabled>Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker date={date} setDate={setDate} />
            <Button className="w-full md:w-auto" onClick={handleGenerateReport} disabled={!reportType || !date}>
              <Filter className="mr-2 h-4 w-4" />
              View Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
            <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>As of {reportData.reportDate.toLocaleDateString()}</CardDescription>
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
                {reportData.data.map((item) => (
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
                            {formatCurrency(reportData.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(reportData.totalCredit)}
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
