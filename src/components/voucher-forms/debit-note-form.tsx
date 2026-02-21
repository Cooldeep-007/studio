'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
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
        if (!data.uqc) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UQC required", path: ["uqc"] });
        }
    }
});

const debitNoteSchema = z.object({
  supplierLedgerId: z.string().min(1, "Supplier is required."),
  gstin: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  
  originalInvoiceNo: z.string().min(1, "Original invoice number is required."),
  originalInvoiceDate: z.date(),
  debitNoteDate: z.date(),
  
  reasonLedgerId: z.string().min(1, "A reason account (e.g. Purchase Return) is required."),
  
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),

  totalTaxableAmount: z.number().optional(),
  totalGst: z.number().optional(),
  grandTotal: z.number().optional(),
  
  narration: z.string().optional(),
}).refine(data => !data.debitNoteDate || !data.originalInvoiceDate || data.debitNoteDate >= data.originalInvoiceDate, {
  message: "Debit note date cannot be before the original invoice date.",
  path: ["debitNoteDate"],
});


type DebitNoteFormValues = z.infer<typeof debitNoteSchema>;

const newLineItemDefault = { 
  itemId: '',
  itemType: 'Goods' as 'Goods' | 'Services',
  hsnSacCode: '',
  quantity: 1, 
  uqc: '', 
  rate: 0, 
  gstRate: 0,
};

const defaultValues: DebitNoteFormValues = {
  supplierLedgerId: '',
  gstin: '',
  placeOfSupply: '',
  originalInvoiceNo: '',
  reasonLedgerId: '',
  debitNoteDate: new Date(),
  originalInvoiceDate: new Date(),
  lineItems: [newLineItemDefault],
  narration: '',
};

export function DebitNoteForm() {
    const { toast } = useToast();
    const [supplierLedgers, setSupplierLedgers] = React.useState(() => mockLedgers.filter(l => l.group === 'Sundry Creditor'));
    const [items, setItems] = React.useState(() => [...mockItems]);

    const form = useForm<DebitNoteFormValues>({
        resolver: zodResolver(debitNoteSchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });

    const { watch, setValue, getValues, trigger, reset } = form;

    const reasonLedgers = React.useMemo(() => mockLedgers.filter(l => l.parentLedgerId === 'group-purchase-accounts' || l.parentLedgerId === 'group-indirect-expenses'), []);
    const companyState = "Karnataka";

    const lineItems = watch('lineItems');
    const placeOfSupply = watch('placeOfSupply');
    const partyLedgerId = watch('supplierLedgerId');

    const handleItemCreated = (newItem: Item, index: number) => {
        setItems(prev => [...prev, newItem]);
        setValue(`lineItems.${index}.itemId`, newItem.id, { shouldDirty: true, shouldTouch: true });
        handleItemSelect(newItem.id, index);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setSupplierLedgers(prev => [...prev, newLedger]);
        setValue('supplierLedgerId', newLedger.id, { shouldValidate: true });
    };

    const handleItemSelect = (itemId: string, index: number) => {
        const selectedItem = items.find(item => item.id === itemId);
        if (selectedItem) {
            setValue(`lineItems.${index}.itemType`, selectedItem.type);
            setValue(`lineItems.${index}.hsnSacCode`, selectedItem.type === 'Goods' ? selectedItem.hsnCode : selectedItem.sacCode);
            setValue(`lineItems.${index}.rate`, selectedItem.unitPrice, { shouldValidate: true });
            setValue(`lineItems.${index}.gstRate`, selectedItem.gstRate);
            
            if (selectedItem.type === 'Goods') {
                setValue(`lineItems.${index}.uqc`, selectedItem.uqc);
                const currentQuantity = getValues(`lineItems.${index}.quantity`);
                if (currentQuantity === undefined || currentQuantity === 0) {
                  setValue(`lineItems.${index}.quantity`, 1);
                }
            } else { // It's a service
                setValue(`lineItems.${index}.quantity`, 1);
                setValue(`lineItems.${index}.uqc`, '');
            }
            trigger(`lineItems.${index}`);
        }
    };

     React.useEffect(() => {
        const party = supplierLedgers.find(c => c.id === partyLedgerId);
        if (party) {
            setValue('gstin', party.gstDetails?.gstin || '');
            if(party.contactDetails?.state) {
              setValue('placeOfSupply', party.contactDetails.state, { shouldValidate: true });
            }
        }
    }, [partyLedgerId, setValue, supplierLedgers]);

    const calculateTotals = React.useCallback(() => {
        let subTotal = 0;
        let totalGstAmount = 0;

        getValues('lineItems').forEach(item => {
            const quantity = item.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
            const rate = Number(item.rate) || 0;
            const gstRate = Number(item.gstRate) || 0;
            
            const taxableValue = quantity * rate;
            const gstAmount = taxableValue * (gstRate / 100);

            subTotal += taxableValue;
            totalGstAmount += gstAmount;
        });
        
        setValue('totalTaxableAmount', subTotal);
        setValue('totalGst', totalGstAmount);
        setValue('grandTotal', subTotal + totalGstAmount);

    }, [getValues, setValue]);

    React.useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name && name.startsWith('lineItems')) {
                calculateTotals();
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, calculateTotals]);

    const { totalTaxableAmount, totalGst, grandTotal } = watch();
    
    const isIntraState = placeOfSupply === companyState;
    const cgst = isIntraState ? (totalGst || 0) / 2 : 0;
    const sgst = isIntraState ? (totalGst || 0) / 2 : 0;
    const igst = !isIntraState ? (totalGst || 0) : 0;

    function onSubmit(data: DebitNoteFormValues) {
        console.log(data);
        toast({
            title: "Debit Note Created",
            description: `Debit Note against invoice ${data.originalInvoiceNo} has been saved.`,
        });
        reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Debit Note (Purchase Return)</CardTitle>
                        <CardDescription>Issue a debit note to a supplier for returned goods or other reasons.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField
                                control={form.control}
                                name="supplierLedgerId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier (To Debit)</FormLabel>
                                    <div className="flex gap-2">
                                        <Combobox
                                            options={supplierLedgers.map(l => ({ value: l.id, label: l.ledgerName }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select supplier"
                                            searchPlaceholder="Search supplier..."
                                            emptyText="No supplier found."
                                        />
                                        <AddLedgerSheet ledgers={mockLedgers} onLedgerCreated={handleLedgerCreated}>
                                            <Button type="button" variant="outline" size="icon" aria-label="Add new ledger"><PlusCircle className="h-4 w-4" /></Button>
                                        </AddLedgerSheet>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField control={form.control} name="gstin" render={({ field }) => (<FormItem><FormLabel>Supplier GSTIN</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>)} />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="originalInvoiceNo" render={({ field }) => (<FormItem><FormLabel>Original Invoice No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="originalInvoiceDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Original Invoice Date</FormLabel>
                                   <Popover><PopoverTrigger asChild>
                                           <FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>
                                                   {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                   <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                               </Button></FormControl>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover>
                               <FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="debitNoteDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Debit Note Date</FormLabel>
                                   <Popover><PopoverTrigger asChild>
                                           <FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>
                                                   {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                   <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                               </Button></FormControl>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover>
                               <FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="placeOfSupply" render={({ field }) => (
                                <FormItem><FormLabel>Place of Supply</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl>
                                    <SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">Item Details (for return/adjustment)</h3>
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
                                    const quantity = item?.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
                                    const rate = Number(item?.rate) || 0;
                                    const taxableValue = quantity * rate;
                                    const gstRate = Number(item?.gstRate) || 0;
                                    const gstAmount = taxableValue * (gstRate / 100);
                                    const total = taxableValue + gstAmount;

                                    return (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`lineItems.${index}.itemId`}
                                                    render={({ field: itemField }) => (
                                                        <FormItem className='w-full'>
                                                        <Combobox
                                                            options={items.map(item => ({ value: item.id, label: item.name }))}
                                                            value={itemField.value}
                                                            onChange={(value) => {
                                                                itemField.onChange(value);
                                                                handleItemSelect(value, index);
                                                            }}
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
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.hsnSacCode`} render={({ field }) => ( <Input {...field} readOnly /> )} /></TableCell>
                                        <TableCell>
                                            {currentItemType === 'Goods' && (
                                                <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => ( 
                                                    <Input type="number" {...field} /> 
                                                )} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {currentItemType === 'Goods' && (
                                                <FormField control={form.control} name={`lineItems.${index}.uqc`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                                                </Select>)} />
                                            )}
                                        </TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.rate`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.gstRate`} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={field.value.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent></Select>)} /></TableCell>
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
                            <div className='space-y-4'>
                                <FormField
                                    control={form.control}
                                    name="reasonLedgerId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reason (Account to Credit)</FormLabel>
                                        <Combobox
                                            options={reasonLedgers.map(l => ({ value: l.id, label: l.ledgerName }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="e.g., Purchase Return"
                                            searchPlaceholder="Search reason..."
                                            emptyText="No reason found."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="narration" render={({ field }) => (<FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being debit note raised for goods returned..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="w-full space-y-2 self-end">
                                <div className="flex justify-between"><span>Taxable Value</span><span>{(totalTaxableAmount || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Input CGST Reversal</span><span>{cgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Input SGST Reversal</span><span>{sgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Input IGST Reversal</span><span>{igst.toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Total Debit Note Value</span><span>{(grandTotal || 0).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Save Debit Note</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
