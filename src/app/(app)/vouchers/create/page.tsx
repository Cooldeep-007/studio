'use client';

import * as React from 'react';
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
import { Label } from '@/components/ui/label';

const voucherTypes = [
  'Sales Invoice',
  'Purchase Invoice',
  'Debit Note',
  'Credit Note',
  'Adhoc Invoice',
  'Proforma Invoice',
  'Journal Entry',
];

export default function CreateVoucherPage() {
  const [voucherType, setVoucherType] = React.useState<string>('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Voucher</h1>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>New Voucher</CardTitle>
          <CardDescription>
            Select a voucher type to begin. The form will adapt based on your selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="voucher-type">Voucher Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger id="voucher-type" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a voucher type" />
                </SelectTrigger>
                <SelectContent>
                  {voucherTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Dynamic fields will be loaded here based on voucherType */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
