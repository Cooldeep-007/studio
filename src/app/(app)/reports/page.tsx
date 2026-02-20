import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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

// This is a simplified calculation for demonstration
const trialBalanceData = mockLedgers.map(ledger => ({
  name: ledger.ledgerName,
  group: ledger.group,
  debit: ledger.balanceType === 'Dr' ? ledger.openingBalance : 0,
  credit: ledger.balanceType === 'Cr' ? ledger.openingBalance : 0,
}));

const totalDebit = trialBalanceData.reduce((sum, item) => sum + item.debit, 0);
const totalCredit = trialBalanceData.reduce((sum, item) => sum + item.credit, 0);


export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select filters to generate your report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial-balance">Trial Balance</SelectItem>
                <SelectItem value="pnl" disabled>Profit & Loss</SelectItem>
                <SelectItem value="balance-sheet" disabled>Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker />
            <Button className="w-full lg:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>As of {new Date().toLocaleDateString()}</CardDescription>
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
              {trialBalanceData.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    {item.debit > 0 ? item.debit.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.credit > 0 ? item.credit.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold text-base">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                        {totalDebit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                    <TableCell className="text-right">
                        {totalCredit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
