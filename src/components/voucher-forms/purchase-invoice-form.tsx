'use client';

import { FileWarning } from 'lucide-react';

export function PurchaseInvoiceForm() {
    return (
        <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <div className="text-center">
                <FileWarning className="mx-auto h-8 w-8" />
                <p className="mt-2 font-semibold">Purchase Invoice Form</p>
                <p className="text-sm">This voucher type is not yet implemented.</p>
            </div>
        </div>
    );
}
