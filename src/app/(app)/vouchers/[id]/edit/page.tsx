'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { JournalEntryForm } from '@/components/voucher-forms/journal-entry-form';
import { PaymentReceiptForm } from '@/components/voucher-forms/payment-receipt-form';
import { ContraEntryForm } from '@/components/voucher-forms/contra-entry-form';
import { SalesInvoiceForm } from '@/components/voucher-forms/sales-invoice-form';
import { mockVouchers } from '@/lib/data';
import type { Voucher } from '@/lib/types';
import { FileWarning, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotImplemented = ({ type }: { type: string }) => (
    <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="text-center">
            <FileWarning className="mx-auto h-8 w-8" />
            <p className="mt-2 font-semibold">{type} Edit Form</p>
            <p className="text-sm">Editing this voucher type is not yet implemented.</p>
        </div>
    </div>
);


export default function EditVoucherPage() {
  const params = useParams();
  const router = useRouter();
  const voucherId = params.id as string;
  const [voucher, setVoucher] = React.useState<Voucher | null | undefined>(undefined);

  React.useEffect(() => {
    const foundVoucher = mockVouchers.find(v => v.id === voucherId);
    setVoucher(foundVoucher || null);
  }, [voucherId]);


  const renderVoucherForm = () => {
    if (voucher === undefined) {
        return (
            <div className="flex items-center justify-center h-40 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (voucher === null) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Voucher Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The voucher you are trying to edit does not exist.</p>
                    <Button onClick={() => router.back()} variant="link" className="px-0">
                        Go back
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // In a real implementation, you would pass the voucher data to the forms
    // to pre-populate them, e.g., <SalesInvoiceForm initialData={voucher} />.
    // For now, we render the blank form.
    switch (voucher.voucherType) {
      case 'Sales':
        return <SalesInvoiceForm />;
      case 'Purchase':
        return <NotImplemented type="Purchase" />;
      case 'Payment':
        return <PaymentReceiptForm type="Payment" />;
      case 'Receipt':
        return <PaymentReceiptForm type="Receipt" />;
      case 'Contra':
        return <ContraEntryForm />;
      case 'Journal':
        return <JournalEntryForm />;
      case 'Debit Note':
        return <NotImplemented type="Debit Note" />;
      case 'Credit Note':
        return <NotImplemented type="Credit Note" />;
      default:
        return (
          <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground">
            <p>Cannot edit this voucher type.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Voucher</h1>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Voucher
        </Button>
      </div>
      
      {renderVoucherForm()}
    </div>
  );
}
