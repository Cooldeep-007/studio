'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Item } from '@/lib/types';
import { uqcList, gstRates } from '@/lib/constants';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';
import { mockLedgers } from '@/lib/data';

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  type: z.enum(['Goods', 'Services']),
  unitPrice: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  uqc: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'Goods') {
        if (!data.hsnCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HSN is required.", path: ["hsnCode"] });
        if (!data.uqc) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UQC is required.", path: ["uqc"] });
    }
    if (data.type === 'Services') {
        if (!data.sacCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SAC is required.", path: ["sacCode"] });
    }
});

type ItemFormValues = z.infer<typeof itemSchema>;

const defaultValues: Partial<ItemFormValues> = {
    name: '',
    type: 'Goods',
    unitPrice: 0,
    gstRate: 18,
};

export function AddItemSheet({
  children,
  onItemCreated,
}: {
  children: React.ReactNode;
  onItemCreated: (item: Item) => void;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const { toast } = useToast();
    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues,
    });
    const itemType = form.watch('type');

    async function onSubmit(data: ItemFormValues) {
        const salesLedger = mockLedgers.find(l => l.ledgerName === 'Domestic Sales');
        const purchaseLedger = mockLedgers.find(l => l.ledgerName === 'Purchase Account');

        const newItem: Item = {
            id: `item-${new Date().getTime()}`,
            name: data.name,
            type: data.type,
            hsnCode: data.hsnCode,
            sacCode: data.sacCode,
            unitPrice: data.unitPrice,
            uqc: data.uqc,
            gstRate: data.gstRate,
            salesLedgerId: salesLedger?.id || 'led-01',
            purchaseLedgerId: purchaseLedger?.id || 'led-purchase-account',
        };

        // Simulate API call
        await new Promise(res => setTimeout(res, 500));
        
        onItemCreated(newItem);
        toast({
            title: 'Item Created',
            description: `${newItem.name} has been added to your item master.`,
        });
        setIsOpen(false);
        form.reset();
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                        <SheetHeader>
                            <SheetTitle>Create New Item</SheetTitle>
                            <SheetDescription>
                                Quickly add a new item or service to your master list.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-grow py-6 space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Name <span className="text-destructive">*</span></FormLabel>
                                    <FormControl><Input {...field} autoFocus /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Type <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Goods" /></FormControl>
                                                <FormLabel className="font-normal">Goods</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Services" /></FormControl>
                                                <FormLabel className="font-normal">Services</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {itemType === 'Goods' ? (
                                <FormField control={form.control} name="hsnCode" render={({ field }) => (
                                    <FormItem><FormLabel>HSN Code <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            ) : (
                                <FormField control={form.control} name="sacCode" render={({ field }) => (
                                    <FormItem><FormLabel>SAC Code <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                                    <FormItem><FormLabel>Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="gstRate" render={({ field }) => (
                                    <FormItem><FormLabel>GST % <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={field.value.toString()}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                            </div>

                             {itemType === 'Goods' && (
                                <FormField control={form.control} name="uqc" render={({ field }) => (
                                    <FormItem><FormLabel>UQC <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select UQC"/></SelectTrigger></FormControl>
                                            <SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code} - {u.description}</SelectItem>)}</SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                             )}
                        </div>

                        <SheetFooter className="pt-4 mt-auto">
                            <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Item
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
