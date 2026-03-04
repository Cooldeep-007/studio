
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ParentGroup } from '@/components/add-petty-cash-sheet';

const formSchema = z.object({
  bankName: z.string().min(1, "Bank name is required."),
  accountName: z.string().min(1, "Account name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  ifscCode: z.string().min(1, "IFSC code is required."),
  branchName: z.string().optional(),
  accountType: z.enum(['Savings', 'Current', 'OD', 'CC']),
  parentGroup: z.string().min(1, "Parent group is required."),
  openingBalance: z.coerce.number().optional(),
  balanceType: z.enum(['Dr', 'Cr']).default('Dr'),
  openingBalanceDate: z.date().optional(),
  currency: z.string().default('INR'),
  upiId: z.string().optional(),
  swiftCode: z.string().optional(),
  remarks: z.string().optional(),
  isDefault: z.boolean().default(false),
}).refine(data => (data.openingBalance || 0) > 0 ? !!data.openingBalanceDate : true, {
  message: "Date is required if opening balance is entered.",
  path: ["openingBalanceDate"],
});

type FormValues = z.infer<typeof formSchema>;

const nativeSelectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function AddBankAccountSheet({
  open,
  onOpenChange,
  onSave,
  parentGroups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FormValues) => void;
  parentGroups: ParentGroup[];
}) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        accountType: 'Current',
        parentGroup: 'Bank Accounts',
        openingBalance: 0,
        balanceType: 'Dr',
        openingBalanceDate: new Date(),
        currency: 'INR',
        upiId: '',
        swiftCode: '',
        remarks: '',
        isDefault: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    onSave(data);
    toast({ title: "Bank Account Added", description: `${data.bankName} has been successfully created.` });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Add New Bank Account</SheetTitle>
              <SheetDescription>
                Fill in the details to add a new bank account to your company.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-grow py-6 space-y-4 overflow-y-auto px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Account Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="branchName" render={({ field }) => (<FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="accountType" render={({ field }) => (
                  <FormItem><FormLabel>Account Type *</FormLabel>
                    <select
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      className={nativeSelectClass}
                    >
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                      <option value="OD">Overdraft (OD)</option>
                      <option value="CC">Cash Credit (CC)</option>
                    </select>
                  </FormItem>)} />
              </div>
              <FormField control={form.control} name="parentGroup" render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Group *</FormLabel>
                  <select
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    className={nativeSelectClass}
                  >
                    <option value="">Select parent group</option>
                    {parentGroups.map(pg => (
                      <option key={pg.id} value={pg.group_name}>{pg.group_name} ({pg.primary_nature})</option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="openingBalance" render={({ field }) => (<FormItem><FormLabel>Opening Balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="balanceType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Type</FormLabel>
                      <select
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className={nativeSelectClass}
                      >
                        <option value="Dr">Debit (Dr)</option>
                        <option value="Cr">Credit (Cr)</option>
                      </select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="openingBalanceDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>As of Date</FormLabel>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                        <FormMessage />
                      </FormItem>)} />
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <FormField control={form.control} name="upiId" render={({ field }) => (<FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="swiftCode" render={({ field }) => (<FormItem><FormLabel>SWIFT Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
               </div>
               <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
               <FormField control={form.control} name="isDefault" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Set as default bank account</FormLabel></div></FormItem>)} />
            </div>
            <SheetFooter className="mt-auto pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Account
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
