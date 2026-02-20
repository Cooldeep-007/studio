import { PlusCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { mockLedgers } from "@/lib/data";

export default function LedgersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Ledger
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledgers</CardTitle>
          <CardDescription>
            Your complete list of accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ledger Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead>Balance Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLedgers.map((ledger) => (
                <TableRow key={ledger.id}>
                  <TableCell className="font-medium">{ledger.ledgerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ledger.group}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {ledger.openingBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </TableCell>
                  <TableCell>{ledger.balanceType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
