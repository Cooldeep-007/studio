
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="OD">Overdraft (OD)</SelectItem>
                        <SelectItem value="CC">Cash Credit (CC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>)} />
              </div>
              <FormField control={form.control} name="parentGroup" render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Group *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select parent group" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {parentGroups.map(pg => (
                        <SelectItem key={pg.id} value={pg.group_name}>{pg.group_name} ({pg.primary_nature})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="openingBalance" render={({ field }) => (<FormItem><FormLabel>Opening Balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="balanceType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Dr">Debit (Dr)</SelectItem>
                          <SelectItem value="Cr">Credit (Cr)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="openingBalanceDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>As of Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                        </Popover><FormMessage />
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
