'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { mockLedgers, mockItems, mockCompanies } from '@/lib/data';
import type { Ledger, Item, InvoiceItem, Company } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { AddItemSheet } from '@/components/add-item-sheet';
import { gstStateCodes } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLedgerSheet } from '../add-ledger-sheet';

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  quantity: z.coerce.number().min(0.01, 'Qty > 0'),
  rate: z.coerce.number().min(0),
});

const creditNoteSchema = z.object({
  noteDate: z.date(),
  customerLedgerId: z.string().min(1, 'Customer is required.'),
  originalInvoiceNo: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  remarks: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

type FormValues = z.infer<typeof creditNoteSchema>;
type ItemFormValues = z.infer<typeof lineItemSchema>;

const defaultValues: Partial<FormValues> = {
    noteDate: new Date(),
    items: [{ itemId: '', quantity: 1, rate: 0 }],
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export function CreditNoteForm() {
    const { toast } = useToast();
    const [ledgers, setLedgers] = React.useState<Ledger[]>(() => mockLedgers);
    const [items, setItems] = React.useState<Item[]>(() => mockItems);
    const [company] = React.useState<Company | undefined>(() => mockCompanies.find(c => c.id === 'comp-001'));

    const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);
    const [addLedgerInitialValues, setAddLedgerInitialValues] = React.useState<Partial<Ledger> | undefined>();
    const [isAddItemSheetOpen, setIsAddItemSheetOpen] = React.useState(false);
    const [addItemInitialValues, setAddItemInitialValues] = React.useState<Partial<ItemFormValues> | undefined>();
    const [activeItemIndex, setActiveItemIndex] = React.useState(0);

    const form = useForm<FormValues>({
        resolver: zodResolver(creditNoteSchema),
        defaultValues,
    });
    
    const customerId = useWatch({ control: form.control, name: 'customerLedgerId' });
    const selectedCustomer = React.useMemo(() => ledgers.find(l => l.id === customerId), [customerId, ledgers]);

    React.useEffect(() => {
        if (selectedCustomer?.contactDetails?.state) {
            form.setValue('placeOfSupply', selectedCustomer.contactDetails.state);
        }
    }, [selectedCustomer, form]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchedForm = useWatch({ control: form.control });

    const customerOptions = ledgers
        .filter(l => l.group === 'Sundry Debtor' && !l.isGroup)
        .map(l => ({ value: l.id, label: l.ledgerName }));

    const itemOptions = items.map(i => ({ value: i.id, label: i.name }));
    
    const handleLedgerCreate = (searchValue: string) => {
        const sundryDebtorsGroup = ledgers.find(l => l.ledgerName === 'Sundry Debtors' && l.isGroup);
        setAddLedgerInitialValues({
            ledgerName: searchValue,
            parentLedgerId: sundryDebtorsGroup?.id,
            group: 'Sundry Debtor',
        });
        setIsAddLedgerSheetOpen(true);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setLedgers(prev => [...prev, newLedger]);
        if (newLedger.group === 'Sundry Debtor') {
            form.setValue('customerLedgerId', newLedger.id, { shouldValidate: true });
        }
    };
    
    const handleItemCreate = (searchValue: string, index: number) => {
        setActiveItemIndex(index);
        setAddItemInitialValues({ name: searchValue });
        setIsAddItemSheetOpen(true);
    };
    
    const handleItemCreated = (newItem: Item) => {
        setItems(prev => [...prev, newItem]);
        form.setValue(`items.${activeItemIndex}.itemId`, newItem.id, { shouldValidate: true });
        handleItemSelection(newItem.id, activeItemIndex);
    };
    
    const handleItemSelection = (itemId: string, index: number) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            form.setValue(`items.${index}.rate`, item.unitPrice, { shouldValidate: true });
        }
    };
    
    const calculations = React.useMemo(() => {
        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const companyState = company?.gstin ? gstStateCodes[company.gstin.substring(0, 2)] : undefined;
        const isIntraState = watchedForm.placeOfSupply && companyState && watchedForm.placeOfSupply === companyState;
        
        const processedItems: (InvoiceItem & { itemId: string })[] = (watchedForm.items || []).map(item => {
            const selectedItem = items.find(i => i.id === item.itemId);
            if (!selectedItem) return null;

            const taxableAmount = (item.quantity || 0) * (item.rate || 0);

            let cgst = 0, sgst = 0, igst = 0;

            if (isIntraState) {
                cgst = (taxableAmount * (selectedItem.gstRate / 2)) / 100;
                sgst = (taxableAmount * (selectedItem.gstRate / 2)) / 100;
            } else {
                igst = (taxableAmount * selectedItem.gstRate) / 100;
            }
            
            const total = taxableAmount + cgst + sgst + igst;
            subtotal += taxableAmount;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;

            return {
                itemId: selectedItem.id, name: selectedItem.name, hsnCode: selectedItem.hsnCode, sacCode: selectedItem.sacCode,
                quantity: item.quantity, rate: item.rate, amount: taxableAmount,
                uqc: selectedItem.uqc || 'NOS', gstRate: selectedItem.gstRate,
                cgst, sgst, igst, total
            };
        }).filter(Boolean) as (InvoiceItem & { itemId: string })[];

        const totalGst = totalCgst + totalSgst + totalIgst;
        const grandTotal = subtotal + totalGst;

        return { items: processedItems, subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal, isIntraState };
    }, [watchedForm, items, company]);


    function onSubmit(data: FormValues) {
        console.log({ ...data, calculations });
        toast({
            title: `Credit Note Created`,
            description: 'The sales return voucher has been successfully saved.',
        });
        form.reset(defaultValues);
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Credit Note (Sales Return)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <FormField control={form.control} name="customerLedgerId" render={({ field }) => (
                                    <FormItem className="md:col-span-2 flex flex-col"><FormLabel>Customer <span className="text-destructive">*</span></FormLabel>
                                    <Combobox 
                                        options={customerOptions} 
                                        {...field} 
                                        placeholder="Select customer..."
                                        onCreate={handleLedgerCreate}
                                    />
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="noteDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Note Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="originalInvoiceNo" render={({ field }) => (<FormItem><FormLabel>Original Bill No.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Returned Items</Label>
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead className="w-1/3">Item</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id} className="align-top">
                                                <TableCell>
                                                    <FormField control={form.control} name={`items.${index}.itemId`} render={({ field }) => (
                                                        <Combobox
                                                            options={itemOptions}
                                                            {...field}
                                                            placeholder="Select item..."
                                                            onChange={(value) => { field.onChange(value); handleItemSelection(value, index); }}
                                                            onCreate={(val) => handleItemCreate(val, index)}
                                                        />
                                                    )} />
                                                </TableCell>
                                                <TableCell><FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<Input type="number" {...field} />)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (<Input type="number" {...field} />)} /></TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(calculations.items[index]?.total || 0)}</TableCell>
                                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, rate: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                                </Button>
                            </div>

                            <Separator />
                            <div className="flex justify-end">
                                <div className="w-full max-w-sm space-y-2 text-sm">
                                    <div className="flex justify-between font-medium"><span>Taxable Value</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                                    {calculations.isIntraState ? (
                                        <>
                                            <div className="flex justify-between text-muted-foreground"><span>CGST Reversed</span><span>{formatCurrency(calculations.totalCgst)}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span>SGST Reversed</span><span>{formatCurrency(calculations.totalSgst)}</span></div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between text-muted-foreground"><span>IGST Reversed</span><span>{formatCurrency(calculations.totalIgst)}</span></div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-lg font-bold"><span>Total Credit</span><span>{formatCurrency(calculations.grandTotal)}</span></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Create Credit Note</Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
            <AddLedgerSheet open={isAddLedgerSheetOpen} onOpenChange={setIsAddLedgerSheetOpen} initialValues={addLedgerInitialValues} ledgers={ledgers} onLedgerCreated={handleLedgerCreated} />
            <AddItemSheet open={isAddItemSheetOpen} onOpenChange={setIsAddItemSheetOpen} initialValues={addItemInitialValues as Partial<ItemFormValues> | undefined} onItemCreated={handleItemCreated} />
        </>
    );
}
