
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type ParentGroup = {
  id: number;
  group_name: string;
  primary_nature: string;
};

const formSchema = z.object({
  cashName: z.string().min(1, "Cash ledger name is required."),
  parentGroup: z.string().min(1, "Parent group is required."),
  responsiblePerson: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
  balanceType: z.enum(['Dr', 'Cr']).default('Dr'),
  openingDate: z.date().optional(),
  remarks: z.string().optional(),
}).refine(data => (data.openingBalance || 0) > 0 ? !!data.openingDate : true, {
  message: "Date is required if opening balance is entered.",
  path: ["openingDate"],
});

type FormValues = z.infer<typeof formSchema>;

export function AddPettyCashSheet({
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
        cashName: '',
        parentGroup: 'Cash-in-Hand',
        responsiblePerson: '',
        openingBalance: 0,
        balanceType: 'Dr',
        openingDate: new Date(),
        remarks: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    onSave(data);
    toast({ title: "Petty Cash Added", description: `${data.cashName} has been successfully created.` });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Add New Petty Cash Ledger</SheetTitle>
              <SheetDescription>
                Create a new cash account for daily expenses.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-grow py-6 space-y-4 overflow-y-auto">
              <FormField control={form.control} name="cashName" render={({ field }) => (<FormItem><FormLabel>Cash Name *</FormLabel><FormControl><Input {...field} placeholder="e.g., Office Petty Cash" /></FormControl><FormMessage /></FormItem>)} />
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
              <FormField control={form.control} name="responsiblePerson" render={({ field }) => (<FormItem><FormLabel>Responsible Person</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <div className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <FormField control={form.control} name="openingDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>As of Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>)} />
              </div>
              <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
            </div>
            <SheetFooter className="mt-auto pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Cash Ledger
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
