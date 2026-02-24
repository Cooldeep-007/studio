
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
import { PurchaseInvoiceForm } from '@/components/voucher-forms/purchase-invoice-form';
import { DebitNoteForm } from '@/components/voucher-forms/debit-note-form';
import { CreditNoteForm } from '@/components/voucher-forms/credit-note-form';
import { AdhocVoucherForm } from '@/components/voucher-forms/adhoc-voucher-form';
import { ProformaInvoiceForm } from '@/components/voucher-forms/proforma-invoice-form';
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
    // In a real app, you would fetch this data from an API
    // const foundVoucher = await fetchVoucherById(voucherId);
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

    switch (voucher.voucherType) {
      case 'Sales':
        return <SalesInvoiceForm initialData={voucher} />;
      case 'Purchase':
        return <PurchaseInvoiceForm initialData={voucher} />;
      case 'Payment':
        return <PaymentReceiptForm type="Payment" initialData={voucher} />;
      case 'Receipt':
        return <PaymentReceiptForm type="Receipt" initialData={voucher} />;
      case 'Contra':
        return <ContraEntryForm initialData={voucher} />;
      case 'Journal':
        return <JournalEntryForm initialData={voucher} />;
      case 'Debit Note':
        return <DebitNoteForm />;
      case 'Credit Note':
        return <CreditNoteForm />;
      case 'Adhoc Sale':
      case 'Adhoc Purchase':
        return <AdhocVoucherForm initialData={voucher} />;
      case 'Proforma Invoice':
        return <ProformaInvoiceForm />;
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vouchers
        </Button>
      </div>
      
      {renderVoucherForm()}
    </div>
  );
}
