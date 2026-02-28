'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { AdhocVoucherForm } from '@/components/voucher-forms/adhoc-invoice-form';
import { ProformaInvoiceForm } from '@/components/voucher-forms/proforma-invoice-form';
import type { Voucher } from '@/lib/types';
import { FileWarning, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';

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
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();
  const { profile } = useUser();

  const voucherId = params.id as string;
  const companyId = searchParams.get('companyId');

  const voucherRef = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId || !voucherId) return null;
    return doc(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers', voucherId);
  }, [firestore, profile?.firmId, companyId, voucherId]);

  const { data: voucher, isLoading } = useDoc<Voucher>(voucherRef);


  const renderVoucherForm = () => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-40 mt-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!voucher) {
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

    const firmId = profile?.firmId;

    if (!firmId || !companyId) {
        return <p>Firm or Company ID is missing.</p>;
    }

    switch (voucher.voucherType) {
      case 'Sales':
        return <SalesInvoiceForm initialData={voucher} companyId={companyId} firmId={firmId} />;
      case 'Purchase':
        return <PurchaseInvoiceForm initialData={voucher} companyId={companyId} firmId={firmId} />;
      case 'Payment':
        return <PaymentReceiptForm type="Payment" initialData={voucher} companyId={companyId} firmId={firmId} />;
      case 'Receipt':
        return <PaymentReceiptForm type="Receipt" initialData={voucher} companyId={companyId} firmId={firmId} />;
      case 'Contra':
        return <ContraEntryForm initialData={voucher} companyId={companyId} firmId={firmId} />;
      case 'Journal':
        return <JournalEntryForm initialData={voucher} companyId={companyId} firmId={firmId} />;
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
