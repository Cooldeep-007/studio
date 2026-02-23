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
import { JournalEntryForm } from '@/components/voucher-forms/journal-entry-form';
import { PaymentReceiptForm } from '@/components/voucher-forms/payment-receipt-form';
import { FileWarning } from 'lucide-react';


const voucherTypes = [
  'Sales Invoice',
  'Purchase Invoice',
  'Payment',
  'Receipt',
  'Contra',
  'Journal Entry',
  'Debit Note',
  'Credit Note',
  'Adhoc Invoice',
  'Proforma Invoice',
];

const NotImplemented = ({ type }: { type: string }) => (
    <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="text-center">
            <FileWarning className="mx-auto h-8 w-8" />
            <p className="mt-2 font-semibold">{type} Form</p>
            <p className="text-sm">This voucher type is not yet implemented.</p>
        </div>
    </div>
);


export default function CreateVoucherPage() {
  const [voucherType, setVoucherType] = React.useState<string>('');

  const renderVoucherForm = () => {
    switch (voucherType) {
      case 'Sales Invoice':
        return <NotImplemented type="Sales Invoice" />;
      case 'Purchase Invoice':
        return <NotImplemented type="Purchase Invoice" />;
      case 'Payment':
        return <PaymentReceiptForm type="Payment" />;
      case 'Receipt':
        return <PaymentReceiptForm type="Receipt" />;
      case 'Contra':
        return <JournalEntryForm />;
      case 'Journal Entry':
        return <JournalEntryForm />;
      case 'Debit Note':
        return <NotImplemented type="Debit Note" />;
      case 'Credit Note':
        return <NotImplemented type="Credit Note" />;
      case 'Adhoc Invoice':
        return <NotImplemented type="Adhoc Invoice" />;
      case 'Proforma Invoice':
        return <NotImplemented type="Proforma Invoice" />;
      default:
        return (
          <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground">
            <p>Select a voucher type to begin.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Voucher</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Voucher</CardTitle>
          <CardDescription>
            Select a voucher type to begin. The form will adapt based on your selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-3 max-w-sm">
              <Label htmlFor="voucher-type">Voucher Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger id="voucher-type">
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
          </div>
        </CardContent>
      </Card>
      
      {renderVoucherForm()}
    </div>
  );
}
