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
import { SalesInvoiceForm } from '@/components/voucher-forms/sales-invoice-form';
import { PurchaseInvoiceForm } from '@/components/voucher-forms/purchase-invoice-form';
import { DebitNoteForm } from '@/components/voucher-forms/debit-note-form';
import { CreditNoteForm } from '@/components/voucher-forms/credit-note-form';
import { JournalEntryForm } from '@/components/voucher-forms/journal-entry-form';
import { ProformaInvoiceForm } from '@/components/voucher-forms/proforma-invoice-form';
import { AdhocInvoiceForm } from '@/components/voucher-forms/adhoc-invoice-form';


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

  const renderVoucherForm = () => {
    switch (voucherType) {
      case 'Sales Invoice':
        return <SalesInvoiceForm />;
      case 'Purchase Invoice':
        return <PurchaseInvoiceForm />;
      case 'Debit Note':
        return <DebitNoteForm />;
      case 'Credit Note':
        return <CreditNoteForm />;
      case 'Adhoc Invoice':
        return <AdhocInvoiceForm />;
      case 'Proforma Invoice':
        return <ProformaInvoiceForm />;
      case 'Journal Entry':
        return <JournalEntryForm />;
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
