'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockLedgers, mockItems, mockCompanies } from '@/lib/data';
import type { Ledger, Item, InvoiceItem, Company } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { AddItemSheet } from '@/components/add-item-sheet';
import { indianStates, gstStateCodes } from '@/lib/constants';

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Qty > 0'),
  rate: z.coerce.number().min(0),
});

const salesInvoiceSchema = z.object({
  invoiceDate: z.date(),
  dueDate: z.date().optional(),
  customerLedgerId: z.string().min(1, 'Customer is required.'),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  narration: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

type FormValues = z.infer<typeof salesInvoiceSchema>;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export function SalesInvoiceForm() {
    const { toast } = useToast();
    const [ledgers] = React.useState<Ledger[]>(() => mockLedgers.filter(l => !l.isGroup));
    const [items, setItems] = React.useState<Item[]>(() => mockItems);
    const [company] = React.useState<Company | undefined>(() => mockCompanies.find(c => c.id === 'comp-001'));

    const form = useForm<FormValues>({
        resolver: zodResolver(salesInvoiceSchema),
        defaultValues: {
            invoiceDate: new Date(),
            items: [{ itemId: '', quantity: 1, rate: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchedItems = useWatch({ control: form.control, name: 'items' });
    const placeOfSupply = useWatch({ control: form.control, name: 'placeOfSupply' });

    const customerOptions = ledgers
        .filter(l => l.group === 'Sundry Debtor')
        .map(l => ({ value: l.id, label: l.ledgerName }));

    const itemOptions = items.map(i => ({ value: i.id, label: i.name }));
    
    const handleItemCreated = (newItem: Item) => {
        setItems(prev => [...prev, newItem]);
        const lastIndex = fields.length - 1;
        if (lastIndex >= 0 && !form.getValues(`items.${lastIndex}.itemId`)) {
            form.setValue(`items.${lastIndex}.itemId`, newItem.id, { shouldValidate: true });
        } else {
            append({ itemId: newItem.id, quantity: 1, rate: newItem.unitPrice });
        }
    };
    
    const calculations = React.useMemo(() => {
        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const companyState = company?.gstin ? gstStateCodes[company.gstin.substring(0, 2)] : undefined;
        const isIntraState = placeOfSupply && companyState && placeOfSupply === companyState;

        const processedItems: (InvoiceItem & { itemId: string })[] = watchedItems.map(item => {
            const selectedItem = items.find(i => i.id === item.itemId);
            if (!selectedItem) return null;

            const amount = item.quantity * item.rate;
            let cgst = 0, sgst = 0, igst = 0;

            if (isIntraState) {
                cgst = (amount * (selectedItem.gstRate / 2)) / 100;
                sgst = (amount * (selectedItem.gstRate / 2)) / 100;
            } else {
                igst = (amount * selectedItem.gstRate) / 100;
            }
            
            const total = amount + cgst + sgst + igst;
            subtotal += amount;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;

            return {
                itemId: selectedItem.id,
                name: selectedItem.name,
                quantity: item.quantity,
                rate: item.rate,
                uqc: selectedItem.uqc || 'NOS',
                amount,
                gstRate: selectedItem.gstRate,
                cgst, sgst, igst, total
            };
        }).filter(Boolean) as (InvoiceItem & { itemId: string })[];

        const totalGst = totalCgst + totalSgst + totalIgst;
        const grandTotal = subtotal + totalGst;

        return { items: processedItems, subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal, isIntraState };
    }, [watchedItems, placeOfSupply, items, company]);


    function onSubmit(data: FormValues) {
        console.log({ ...data, calculations });
        toast({
            title: 'Sales Invoice Created',
            description: 'The sales voucher has been successfully saved.',
        });
        form.reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Invoice</CardTitle>
                        <CardDescription>Create a new sales voucher with item details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                             <FormField control={form.control} name="customerLedgerId" render={({ field }) => (
                                <FormItem className="md:col-span-2 flex flex-col"><FormLabel>Customer <span className="text-destructive">*</span></FormLabel><Combobox options={customerOptions} {...field} placeholder="Select customer..." /><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); if (date) form.setValue('dueDate', addDays(date, 30)); }} /></PopoverContent></Popover><FormMessage /></FormItem>
                           )} />
                             <FormField control={form.control} name="dueDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                           )} />
                             <FormField control={form.control} name="placeOfSupply" render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Place of Supply <span className="text-destructive">*</span></FormLabel><Combobox options={indianStates.map(s => ({ value: s, label: s }))} {...field} placeholder="Select state..." /><FormMessage /></FormItem>
                            )} />
                        </div>

                        <div className="space-y-2">
                             <Label>Items</Label>
                             {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start p-2 border rounded-md relative">
                                    <div className="grid grid-cols-12 gap-2 flex-grow">
                                        <FormField control={form.control} name={`items.${index}.itemId`} render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-4"><Combobox options={itemOptions} {...field} placeholder="Select item..."/></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-2"><Input type="number" placeholder="Qty" {...field} /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-2"><Input type="number" placeholder="Rate" {...field} /></FormItem>
                                        )} />
                                        <div className="col-span-12 md:col-span-4 flex items-center justify-end">
                                            <p className="font-mono text-sm">{formatCurrency(calculations.items[index]?.total || 0)}</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-1"><X className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, rate: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                                </Button>
                                 <AddItemSheet onItemCreated={(item) => handleItemCreated(item)}>
                                    <Button type="button" variant="secondary" size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Create Item
                                    </Button>
                                </AddItemSheet>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                                {calculations.isIntraState ? (
                                    <>
                                        <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(calculations.totalCgst)}</span></div>
                                        <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(calculations.totalSgst)}</span></div>
                                    </>
                                ) : (
                                    <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(calculations.totalIgst)}</span></div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Grand Total</span><span>{formatCurrency(calculations.grandTotal)}</span></div>
                            </div>
                        </div>

                         <FormField control={form.control} name="narration" render={({ field }) => (
                            <FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being goods sold on credit..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>Create Sales Voucher</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
