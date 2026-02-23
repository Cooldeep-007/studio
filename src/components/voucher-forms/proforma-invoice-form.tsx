// This file is intentionally left blank. 
// The functionality will be implemented in a future step.
'use client';

import { FileWarning } from 'lucide-react';

export const ProformaInvoiceForm = () => (
    <div className="flex items-center justify-center h-40 mt-6 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="text-center">
            <FileWarning className="mx-auto h-8 w-8" />
            <p className="mt-2 font-semibold">Proforma Invoice Form</p>
            <p className="text-sm">This voucher type is not yet implemented.</p>
        </div>
    </div>
);
