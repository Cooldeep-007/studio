'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Voucher, BillAllocation } from '@/lib/types';

interface BillAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAmount: number;
  outstandingVouchers: Voucher[];
  onSave: (allocations: BillAllocation[]) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
};


export function BillAllocationDialog({
  open,
  onOpenChange,
  paymentAmount,
  outstandingVouchers,
  onSave,
}: BillAllocationDialogProps) {
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      allocations: outstandingVouchers.map(v => ({
        voucherId: v.id,
        voucherNumber: v.voucherNumber,
        outstanding: v.outstandingAmount || 0,
        allocation: 0,
      })),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'allocations',
  });

  const allocations = watch('allocations');
  const totalAllocated = allocations.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
  const unallocatedAmount = paymentAmount - totalAllocated;

  const autoAllocate = () => {
    let remainingAmount = paymentAmount;
    const newAllocations = allocations.map(item => {
        if (remainingAmount > 0) {
            const alloc = Math.min(item.outstanding, remainingAmount);
            remainingAmount -= alloc;
            return { ...item, allocation: alloc };
        }
        return { ...item, allocation: 0 };
    });
    setValue('allocations', newAllocations);
  };
  
  const onSubmit = () => {
    const finalAllocations: BillAllocation[] = allocations
        .filter(item => (item.allocation || 0) > 0)
        .map(item => ({
            voucherId: item.voucherId,
            voucherNumber: item.voucherNumber,
            amount: item.allocation,
        }));
    onSave(finalAllocations);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bill-wise Allocation</DialogTitle>
          <DialogDescription>
            Allocate the payment of {formatCurrency(paymentAmount)} against outstanding invoices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="link" onClick={autoAllocate}>Auto-Allocate</Button>
            </div>
            <div className="overflow-auto h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Voucher No.</TableHead>
                            <TableHead>Outstanding</TableHead>
                            <TableHead>Allocation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                             const voucher = outstandingVouchers.find(v => v.id === field.voucherId);
                             return (
                                <TableRow key={field.id}>
                                    <TableCell>{voucher ? format(new Date(voucher.date), 'dd-MMM-yy') : ''}</TableCell>
                                    <TableCell>{field.voucherNumber}</TableCell>
                                    <TableCell>{formatCurrency(field.outstanding)}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...control.register(`allocations.${index}.allocation`)}
                                            max={field.outstanding}
                                            min={0}
                                        />
                                    </TableCell>
                                </TableRow>
                             )
                        })}
                    </TableBody>
                </Table>
            </div>
            
            <div className="grid grid-cols-3 gap-4 font-medium pt-4 border-t">
                <div>Total to Allocate: {formatCurrency(paymentAmount)}</div>
                <div className='text-green-600'>Total Allocated: {formatCurrency(totalAllocated)}</div>
                <div className={unallocatedAmount < 0 ? 'text-red-600' : ''}>Unallocated: {formatCurrency(unallocatedAmount)}</div>
            </div>

            {unallocatedAmount < 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Over Allocation</AlertTitle>
                    <AlertDescription>
                        Total allocated amount cannot be more than the payment amount.
                    </AlertDescription>
                </Alert>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={unallocatedAmount < 0}>Save Allocations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
