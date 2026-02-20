import Link from "next/link";
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

import { mockVouchers } from "@/lib/data";

export default function VouchersPage() {
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
            A list of all recorded accounting vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockVouchers.map((voucher) => (
                <TableRow key={voucher.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>{voucher.date.toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{voucher.voucherType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {voucher.totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
