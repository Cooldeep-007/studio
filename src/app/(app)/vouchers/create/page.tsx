
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { AdhocVoucherForm } from '@/components/voucher-forms/adhoc-voucher-form';
import { ProformaInvoiceForm } from '@/components/voucher-forms/proforma-invoice-form';
import { DebitNoteForm } from '@/components/voucher-forms/debit-note-form';
import { CreditNoteForm } from '@/components/voucher-forms/credit-note-form';
import { FileWarning, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';


const allVoucherTypes = [
  { value: 'Adhoc Voucher', label: 'Adhoc Sale / Purchase' },
  { value: 'Proforma Invoice', label: 'Proforma Invoice (Non-Accounting)' },
  { value: 'Sales', label: 'Sales Invoice' },
  { value: 'Purchase', label: 'Purchase Invoice' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Receipt', label: 'Receipt' },
  { value: 'Contra', label: 'Contra' },
  { value: 'Debit Note', label: 'Debit Note (Purchase Return)' },
  { value: 'Credit Note', label: 'Credit Note (Sales Return)' },
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
  const [voucherType, setVoucherType] = React.useState<string>(searchParams.get('type') || '');

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
      case 'Adhoc Voucher':
        return <AdhocVoucherForm />;
      case 'Proforma Invoice':
        return <ProformaInvoiceForm />;
      case 'Debit Note':
        return <DebitNoteForm />;
      case 'Credit Note':
        return <CreditNoteForm />;
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
        <Link href="/vouchers">
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vouchers
            </Button>
        </Link>
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
