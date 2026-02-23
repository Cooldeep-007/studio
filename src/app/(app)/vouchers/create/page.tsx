'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
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
import { ContraEntryForm } from '@/components/voucher-forms/contra-entry-form';
import { SalesInvoiceForm } from '@/components/voucher-forms/sales-invoice-form';
import { PurchaseInvoiceForm } from '@/components/voucher-forms/purchase-invoice-form';
import { AdhocInvoiceForm } from '@/components/voucher-forms/adhoc-invoice-form';
import { ProformaInvoiceForm } from '@/components/voucher-forms/proforma-invoice-form';
import { FileWarning } from 'lucide-react';


const allVoucherTypes = [
  { value: 'Proforma Invoice', label: 'Proforma Invoice (Non-Accounting)' },
  { value: 'Sales', label: 'Sales Invoice' },
  { value: 'Purchase', label: 'Purchase Invoice' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Receipt', label: 'Receipt' },
  { value: 'Contra', label: 'Contra' },
  { value: 'Adhoc Invoice', label: 'Adhoc Invoice' },
  { value: 'Debit Note', label: 'Debit Note' },
  { value: 'Credit Note', label: 'Credit Note' },
  { value: 'Journal', label: 'Journal (Double Entry)' },
];

const bankVoucherTypes = ['Payment', 'Receipt', 'Contra'];

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
  const searchParams = useSearchParams();
  const context = searchParams.get('context');
  const [voucherType, setVoucherType] = React.useState<string>('');

  const voucherTypes = context === 'bank' || context === 'cash' 
    ? allVoucherTypes.filter(vt => bankVoucherTypes.includes(vt.value)) 
    : allVoucherTypes;

  const renderVoucherForm = () => {
    switch (voucherType) {
      case 'Sales':
        return <SalesInvoiceForm />;
      case 'Purchase':
        return <PurchaseInvoiceForm />;
      case 'Payment':
        return <PaymentReceiptForm type="Payment" />;
      case 'Receipt':
        return <PaymentReceiptForm type="Receipt" />;
      case 'Contra':
        return <ContraEntryForm />;
      case 'Journal':
        return <JournalEntryForm />;
      case 'Adhoc Invoice':
        return <AdhocInvoiceForm />;
      case 'Proforma Invoice':
        return <ProformaInvoiceForm />;
      case 'Debit Note':
        return <NotImplemented type="Debit Note" />;
      case 'Credit Note':
        return <NotImplemented type="Credit Note" />;
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
        <h1 className="text-2xl font-bold">Add Transaction</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
          <CardDescription>
            Select the type of transaction you want to record. The form will adapt based on your selection.
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
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
