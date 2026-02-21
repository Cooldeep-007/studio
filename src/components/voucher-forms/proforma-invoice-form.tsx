'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers, mockItems } from '@/lib/data';
import type { Ledger, Item } from '@/lib/types';
import { indianStates, uqcList, gstRates } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AddLedgerSheet } from '../add-ledger-sheet';
import { AddItemSheet } from '../add-item-sheet';
import { Combobox } from '../ui/combobox';

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  itemType: z.enum(['Goods', 'Services']),
  hsnSacCode: z.string().optional(),
  quantity: z.coerce.number().optional(),
  uqc: z.string().optional(),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  gstRate: z.coerce.number().default(0),
}).superRefine((data, ctx) => {
    if (data.itemType === 'Goods') {
        if (!data.quantity || data.quantity <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Qty > 0 required", path: ["quantity"] });
        }
    }
});

const proformaInvoiceSchema = z.object({
  proformaNumber: z.string().min(1, 'Proforma number is required.'),
  proformaDate: z.date(),
  partyLedgerId: z.string().min(1, "Customer is required."),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),
  
  terms: z.string().optional(),
});

type ProformaInvoiceFormValues = z.infer<typeof proformaInvoiceSchema>;

const newLineItemDefault = { 
  itemId: '',
  itemType: 'Goods' as 'Goods' | 'Services',
  hsnSacCode: '',
  quantity: 1, 
  uqc: '', 
  rate: 0, 
  gstRate: 0,
};

const defaultValues: Partial<ProformaInvoiceFormValues> = {
  proformaNumber: '',
  proformaDate: new Date(),
  partyLedgerId: '',
  placeOfSupply: '',
  lineItems: [newLineItemDefault],
  terms: '',
};

export function ProformaInvoiceForm() {
    const { toast } = useToast();
    const [customerLedgers, setCustomerLedgers] = React.useState(() => mockLedgers.filter(l => l.group === 'Sundry Debtor'));
    const [items, setItems] = React.useState(() => [...mockItems]);

    const form = useForm<ProformaInvoiceFormValues>({
        resolver: zodResolver(proformaInvoiceSchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });

    const { watch, setValue, getValues, reset, control } = form;

    const companyState = "Karnataka";

    const [lineItems, placeOfSupply] = watch(["lineItems", "placeOfSupply"]);

     const handleItemCreated = (newItem: Item, index: number) => {
        setItems(prev => [...prev, newItem]);
        handleItemSelect(newItem.id, index);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setCustomerLedgers(prev => [...prev, newLedger]);
        setValue('partyLedgerId', newLedger.id, { shouldValidate: true });
    };

    const handleItemSelect = (itemId: string, index: number) => {
        const selectedItem = items.find(item => item.id === itemId);
        if (selectedItem) {
            update(index, {
                ...lineItems[index],
                itemId: selectedItem.id,
                itemType: selectedItem.type,
                hsnSacCode: selectedItem.type === 'Services' ? selectedItem.sacCode : selectedItem.hsnCode,
                rate: selectedItem.unitPrice,
                gstRate: selectedItem.gstRate,
                quantity: selectedItem.type === 'Goods' ? 1 : undefined,
                uqc: selectedItem.type === 'Goods' ? selectedItem.uqc : undefined,
            });
        }
    };

    const { subtotal, totalGst, grandTotal } = React.useMemo(() => {
        let subtotal = 0;
        let totalGst = 0;

        lineItems.forEach(item => {
            const quantity = item.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
            const rate = Number(item.rate) || 0;
            const taxableValue = quantity * rate;
            const gstOnItem = taxableValue * (Number(item.gstRate) / 100);

            subtotal += taxableValue;
            totalGst += gstOnItem;
        });
        
        const grandTotal = subtotal + totalGst;
        
        return { subtotal, totalGst, grandTotal };
    }, [lineItems]);

    const isIntraState = placeOfSupply === companyState;
    const cgst = isIntraState ? (totalGst || 0) / 2 : 0;
    const sgst = isIntraState ? (totalGst || 0) / 2 : 0;
    const igst = !isIntraState ? (totalGst || 0) : 0;

    function onSubmit(data: ProformaInvoiceFormValues) {
        const finalData = { ...data, subtotal, totalGst, grandTotal, cgst, sgst, igst };
        console.log(finalData);
        toast({
            title: "Proforma Invoice Saved",
            description: `Proforma Invoice ${data.proformaNumber} has been saved as a draft.`,
        });
        reset();
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Proforma Invoice</CardTitle>
                        <CardDescription>Create a quotation or preliminary bill. No accounting entries will be made.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <FormField control={control} name="proformaNumber" render={({ field }) => (<FormItem><FormLabel>Proforma No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={control} name="proformaDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                             <FormField control={control} name="partyLedgerId" render={({ field }) => (
                                <FormItem><FormLabel>Customer</FormLabel>
                                <div className="flex gap-2">
                                    <Combobox
                                        options={customerLedgers.map(l => ({ value: l.id, label: l.ledgerName }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select customer"
                                        searchPlaceholder="Search customer..."
                                        emptyText="No customer found."
                                    />
                                    <AddLedgerSheet ledgers={mockLedgers} onLedgerCreated={handleLedgerCreated}>
                                        <Button type="button" variant="outline" size="icon" aria-label="Add new ledger"><PlusCircle className="h-4 w-4" /></Button>
                                    </AddLedgerSheet>
                                </div>
                                <FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="placeOfSupply" render={({ field }) => (<FormItem><FormLabel>Place of Supply</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl><SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">Item Details</h3>
                          <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Item</TableHead>
                                    <TableHead>HSN/SAC</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>UQC</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>GST%</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const currentItemType = lineItems[index]?.itemType;
                                    const item = lineItems[index];
                                    const quantity = item.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
                                    const rate = Number(item.rate) || 0;
                                    const taxableValue = quantity * rate;
                                    const gstRate = Number(item.gstRate) || 0;
                                    const gstAmount = taxableValue * (gstRate / 100);
                                    const total = taxableValue + gstAmount;

                                    return (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <FormField
                                                    control={control}
                                                    name={`lineItems.${index}.itemId`}
                                                    render={({ field: itemField }) => (
                                                        <FormItem className='w-full'>
                                                        <Combobox
                                                            options={items.map(item => ({ value: item.id, label: item.name }))}
                                                            value={itemField.value}
                                                            onChange={(value) => handleItemSelect(value, index)}
                                                            placeholder="Select Item"
                                                            searchPlaceholder="Search item..."
                                                            emptyText="No item found."
                                                        />
                                                        </FormItem>
                                                    )}
                                                />
                                                 <AddItemSheet onItemCreated={(newItem) => handleItemCreated(newItem, index)}>
                                                    <Button type="button" variant="outline" size="icon" aria-label="Add new item"><PlusCircle className="h-4 w-4" /></Button>
                                                </AddItemSheet>
                                            </div>
                                        </TableCell>
                                        <TableCell><FormField control={control} name={`lineItems.${index}.hsnSacCode`} render={({ field }) => ( <Input {...field} /> )} /></TableCell>
                                        <TableCell>
                                            {currentItemType === 'Goods' && (
                                                <FormField control={control} name={`lineItems.${index}.quantity`} render={({ field }) => ( 
                                                    <Input type="number" {...field} /> 
                                                )} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {currentItemType === 'Goods' && (
                                                <FormField control={control} name={`lineItems.${index}.uqc`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                                                </Select>)} />
                                            )}
                                        </TableCell>
                                        <TableCell><FormField control={control} name={`lineItems.${index}.rate`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={control} name={`lineItems.${index}.gstRate`} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={field.value.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                        <TableCell className="text-right">
                                            {total.toFixed(2)}
                                        </TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                          </Table>
                          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append(newLineItemDefault)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                           <FormField control={control} name="terms" render={({ field }) => (<FormItem><FormLabel>Terms & Conditions</FormLabel><FormControl><Textarea placeholder="Payment terms, delivery schedule, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <div className="w-full space-y-2 self-end">
                                <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>CGST</span><span>{cgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>SGST</span><span>{sgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>IGST</span><span>{igst.toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{grandTotal.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                         <Button type="submit" disabled={form.formState.isSubmitting}>Save as Draft</Button>
                         <Button type="button" variant="outline" disabled><Send className="mr-2 h-4 w-4"/>Convert to Sales Invoice</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
