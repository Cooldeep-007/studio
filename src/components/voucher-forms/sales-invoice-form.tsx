
'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, X, Sparkles, Building, Hash, Percent, FileText, Phone, Mail } from 'lucide-react';
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
import type { Ledger, Item, InvoiceItem, Company, Voucher, LedgerGroup } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { AddItemSheet } from '@/components/add-item-sheet';
import { indianStates, gstStateCodes } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLedgerSheet } from '../add-ledger-sheet';

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Qty > 0'),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).max(100).optional(),
});

const salesInvoiceSchema = z.object({
  invoiceDate: z.date(),
  dueDate: z.date().optional(),
  customerLedgerId: z.string().min(1, 'Customer is required.'),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  isGstApplicable: z.boolean().default(true),
  isReverseCharge: z.boolean().default(false),
  isTcsApplicable: z.boolean().default(false),
  tcsRate: z.coerce.number().optional(),
  eInvoiceRef: z.string().optional(),
  eWayBillNo: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

type FormValues = z.infer<typeof salesInvoiceSchema>;
type ItemFormValues = z.infer<typeof lineItemSchema>;

const defaultValues: Partial<FormValues> = {
    invoiceDate: new Date(),
    dueDate: addDays(new Date(), 30),
    isGstApplicable: true,
    isReverseCharge: false,
    isTcsApplicable: false,
    remarks: "Thank You For Your Business",
    items: [{ itemId: '', quantity: 1, rate: 0, discount: 0 }],
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

interface SalesInvoiceFormProps {
    initialData?: Voucher;
}

export function SalesInvoiceForm({ initialData }: SalesInvoiceFormProps) {
    const { toast } = useToast();
    const [ledgers, setLedgers] = React.useState<Ledger[]>(() => mockLedgers.filter(l => !l.isGroup));
    const [items, setItems] = React.useState<Item[]>(() => mockItems);
    const [company] = React.useState<Company | undefined>(() => mockCompanies.find(c => c.id === 'comp-001'));
    const isEditMode = !!initialData;

    const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);
    const [addLedgerInitialValues, setAddLedgerInitialValues] = React.useState<Partial<Ledger> | undefined>();
    const [isAddItemSheetOpen, setIsAddItemSheetOpen] = React.useState(false);
    const [addItemInitialValues, setAddItemInitialValues] = React.useState<Partial<ItemFormValues> | undefined>();
    const [activeItemIndex, setActiveItemIndex] = React.useState(0);

    const form = useForm<FormValues>({
        resolver: zodResolver(salesInvoiceSchema),
        defaultValues: isEditMode ? undefined : defaultValues,
    });
    
    const customerId = useWatch({ control: form.control, name: 'customerLedgerId' });
    const selectedCustomer = React.useMemo(() => ledgers.find(l => l.id === customerId), [customerId, ledgers]);

    React.useEffect(() => {
        if (selectedCustomer?.contactDetails?.state) {
            form.setValue('placeOfSupply', selectedCustomer.contactDetails.state);
        }
         if (selectedCustomer?.tdsTcsConfig?.tcsEnabled) {
            form.setValue('isTcsApplicable', true);
            form.setValue('tcsRate', selectedCustomer.tdsTcsConfig.tcsRate);
        } else {
             form.setValue('isTcsApplicable', false);
             form.setValue('tcsRate', 0);
        }
    }, [selectedCustomer, form]);

    React.useEffect(() => {
        if (isEditMode && initialData?.invoiceDetails) {
            form.reset({
                invoiceDate: new Date(initialData.date),
                dueDate: initialData.invoiceDetails.dueDate ? new Date(initialData.invoiceDetails.dueDate) : undefined,
                customerLedgerId: initialData.partyLedgerId,
                placeOfSupply: initialData.invoiceDetails.placeOfSupply,
                remarks: initialData.invoiceDetails.remarks,
                isGstApplicable: true, // Assuming it's always applicable for saved invoices
                isReverseCharge: initialData.invoiceDetails.isReverseCharge,
                isTcsApplicable: !!initialData.invoiceDetails.tcsAmount && initialData.invoiceDetails.tcsAmount > 0,
                tcsRate: initialData.invoiceDetails.tcsAmount ? (initialData.invoiceDetails.tcsAmount / initialData.invoiceDetails.subtotal) * 100 : 0,
                eInvoiceRef: initialData.invoiceDetails.eInvoiceRef,
                eWayBillNo: initialData.invoiceDetails.eWayBillNo,
                items: initialData.invoiceDetails.items.map(item => ({
                    itemId: item.itemId,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    discount: item.discount,
                })),
            });
        }
    }, [initialData, form, isEditMode]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchedForm = useWatch({ control: form.control });

    const customerOptions = ledgers
        .filter(l => l.group === 'Sundry Debtor')
        .map(l => ({ value: l.id, label: l.ledgerName }));

    const itemOptions = items.map(i => ({ value: i.id, label: i.name }));
    
    const handleLedgerCreate = (searchValue: string, group: LedgerGroup) => {
        setAddLedgerInitialValues({ ledgerName: searchValue, group });
        setIsAddLedgerSheetOpen(true);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setLedgers(prev => [...prev, newLedger]);
        form.setValue('customerLedgerId', newLedger.id, { shouldValidate: true });
    };

    const handleItemCreate = (searchValue: string, index: number) => {
        setActiveItemIndex(index);
        setAddItemInitialValues({ description: searchValue });
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
        let totalDiscount = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const companyState = company?.gstin ? gstStateCodes[company.gstin.substring(0, 2)] : undefined;
        const isIntraState = watchedForm.placeOfSupply && companyState && watchedForm.placeOfSupply === companyState;
        
        const taxableValueForTcs = (watchedForm.items || []).reduce((acc, item) => {
            if (!item.itemId) return acc;
            const amount = (item.quantity || 0) * (item.rate || 0);
            const discountAmount = amount * ((item.discount || 0) / 100);
            return acc + (amount - discountAmount);
        }, 0);
        
        const tcsAmount = watchedForm.isTcsApplicable ? (taxableValueForTcs * (watchedForm.tcsRate || 0)) / 100 : 0;

        const processedItems: (InvoiceItem & { itemId: string })[] = (watchedForm.items || []).map(item => {
            const selectedItem = items.find(i => i.id === item.itemId);
            if (!selectedItem) return null;

            const amount = (item.quantity || 0) * (item.rate || 0);
            const discountAmount = amount * ((item.discount || 0) / 100);
            const taxableAmount = amount - discountAmount;

            let cgst = 0, sgst = 0, igst = 0;

            if (watchedForm.isGstApplicable) {
                if (isIntraState) {
                    cgst = (taxableAmount * (selectedItem.gstRate / 2)) / 100;
                    sgst = (taxableAmount * (selectedItem.gstRate / 2)) / 100;
                } else {
                    igst = (taxableAmount * selectedItem.gstRate) / 100;
                }
            }
            
            const total = taxableAmount + cgst + sgst + igst;
            subtotal += taxableAmount;
            totalDiscount += discountAmount;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;

            return {
                itemId: selectedItem.id, name: selectedItem.name, hsnCode: selectedItem.hsnCode, sacCode: selectedItem.sacCode,
                quantity: item.quantity, rate: item.rate, discount: item.discount, amount: taxableAmount,
                uqc: selectedItem.uqc || 'NOS', gstRate: selectedItem.gstRate,
                cgst, sgst, igst, total
            };
        }).filter(Boolean) as (InvoiceItem & { itemId: string })[];

        const totalGst = totalCgst + totalSgst + totalIgst;
        const grandTotal = subtotal + totalGst + tcsAmount;
        const roundedTotal = Math.round(grandTotal);
        const roundOff = roundedTotal - grandTotal;

        return { items: processedItems, subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, totalGst, tcsAmount, grandTotal: roundedTotal, roundOff, isIntraState };
    }, [watchedForm, items, company]);


    function onSubmit(data: FormValues) {
        console.log({ ...data, calculations });
        toast({
            title: `Sales Invoice ${isEditMode ? 'Updated' : 'Created'}`,
            description: 'The sales voucher has been successfully saved.',
        });
        if (!isEditMode) {
            form.reset(defaultValues);
        }
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEditMode ? 'Edit Sales Invoice' : 'New Sales Invoice'}</CardTitle>
                            <CardDescription>Voucher No: <span className="font-mono text-primary">{isEditMode ? initialData?.voucherNumber : 'FY24-AUTO-001'}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* HEADER */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <FormField control={form.control} name="customerLedgerId" render={({ field }) => (
                                    <FormItem className="md:col-span-2 flex flex-col"><FormLabel>Customer <span className="text-destructive">*</span></FormLabel>
                                    <Combobox 
                                        options={customerOptions} 
                                        {...field} 
                                        placeholder="Select customer..."
                                        onCreate={(value) => handleLedgerCreate(value, 'Sundry Debtor')}
                                    />
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); if (date) form.setValue('dueDate', addDays(date, selectedCustomer?.creditControl?.creditPeriod || 30)); }} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                            </div>

                            {selectedCustomer && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <Card className="p-4">
                                        <h4 className="font-semibold mb-2 text-foreground">Billing Address</h4>
                                        <p>{selectedCustomer.contactDetails?.addressLine1}</p>
                                        <p>{selectedCustomer.contactDetails?.city}, {selectedCustomer.contactDetails?.state} - {selectedCustomer.contactDetails?.pincode}</p>
                                        <p className="mt-2 flex items-center gap-2"><FileText className="h-4 w-4" />GSTIN: <span className="font-mono">{selectedCustomer.gstDetails?.gstin || 'N/A'}</span></p>
                                        <p className="flex items-center gap-2"><Hash className="h-4 w-4" />PAN: <span className="font-mono">{selectedCustomer.contactDetails?.pan || 'N/A'}</span></p>
                                    </Card>
                                    <Card className="p-4">
                                        <h4 className="font-semibold mb-2 text-foreground">Contact Details</h4>
                                        <p className="flex items-center gap-2"><Building className="h-4 w-4" />{selectedCustomer.ledgerName}</p>
                                        {selectedCustomer.contactDetails?.contactPerson && <p>{selectedCustomer.contactDetails.contactPerson}</p>}
                                        <p className="mt-2 flex items-center gap-2"><Phone className="h-4 w-4" />{selectedCustomer.contactDetails?.mobileNumber || 'N/A'}</p>
                                        <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{selectedCustomer.contactDetails?.email || 'N/A'}</p>
                                    </Card>
                                </div>
                            )}

                            {/* COMPLIANCE */}
                            <Accordion type="single" collapsible>
                                <AccordionItem value="compliance">
                                    <AccordionTrigger><Sparkles className="mr-2 h-4 w-4 text-primary" />Compliance &amp; Statutory</AccordionTrigger>
                                    <AccordionContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="placeOfSupply" render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel>Place of Supply <span className="text-destructive">*</span></FormLabel><Combobox options={indianStates.map(s => ({ value: s, label: s }))} {...field} placeholder="Select state..." /><FormMessage /></FormItem>
                                        )} />
                                        <FormItem><FormLabel>Tax Type</FormLabel><Input disabled value={calculations.isIntraState ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'} /></FormItem>
                                        <div className="space-y-4 pt-2">
                                            <FormField control={form.control} name="isReverseCharge" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Reverse Charge Applicable</FormLabel></FormItem>)} />
                                            <FormField control={form.control} name="isTcsApplicable" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>TCS Applicable</FormLabel></FormItem>)} />
                                        </div>
                                        <FormField control={form.control} name="tcsRate" render={({ field }) => (<FormItem><FormLabel>TCS Rate (%)</FormLabel><Input type="number" {...field} disabled={!watchedForm.isTcsApplicable} /></FormItem>)} />
                                        <FormField control={form.control} name="eInvoiceRef" render={({ field }) => (<FormItem><FormLabel>E-Invoice Ref No</FormLabel><Input {...field} /></FormItem>)} />
                                        <FormField control={form.control} name="eWayBillNo" render={({ field }) => (<FormItem><FormLabel>E-Way Bill No</FormLabel><Input {...field} /></FormItem>)} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            
                            {/* ITEMS TABLE */}
                            <div className="space-y-2">
                                <Label>Items</Label>
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead className="w-1/3">Item</TableHead><TableHead>HSN/SAC</TableHead><TableHead>GST%</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>Discount %</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const selectedItem = items.find(i => i.id === watchedForm.items?.[index]?.itemId);
                                            return (
                                            <TableRow key={field.id} className="align-top">
                                                <TableCell>
                                                    <FormField control={form.control} name={`items.${index}.itemId`} render={({ field }) => (
                                                        <Combobox
                                                            options={itemOptions}
                                                            {...field}
                                                            placeholder="Select item..."
                                                            searchPlaceholder="Search or create item..."
                                                            emptyText="No items found."
                                                            onChange={(value) => { field.onChange(value); handleItemSelection(value, index); }}
                                                            onCreate={(searchValue) => handleItemCreate(searchValue, index)}
                                                        />
                                                    )} />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{selectedItem?.hsnCode || selectedItem?.sacCode || '-'}</TableCell>
                                                <TableCell className="text-center">{selectedItem?.gstRate || '-'}</TableCell>
                                                <TableCell><FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<Input type="number" {...field} />)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (<Input type="number" {...field} />)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`items.${index}.discount`} render={({ field }) => (<Input type="number" {...field} />)} /></TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(calculations.items[index]?.total || 0)}</TableCell>
                                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, rate: 0, discount: 0 })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* FOOTER */}
                            <div className="flex justify-end">
                                <div className="w-full max-w-sm space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal + calculations.totalDiscount)}</span></div>
                                    <div className="flex justify-between"><span>Discount</span><span className="text-red-600">-{formatCurrency(calculations.totalDiscount)}</span></div>
                                    <Separator />
                                    <div className="flex justify-between font-medium"><span>Taxable Value</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                                    {calculations.isIntraState ? (
                                        <>
                                            <div className="flex justify-between text-muted-foreground"><span>CGST</span><span>{formatCurrency(calculations.totalCgst)}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span>SGST</span><span>{formatCurrency(calculations.totalSgst)}</span></div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between text-muted-foreground"><span>IGST</span><span>{formatCurrency(calculations.totalIgst)}</span></div>
                                    )}
                                    {watchedForm.isTcsApplicable && (
                                        <div className="flex justify-between text-muted-foreground"><span>TCS ({watchedForm.tcsRate || 0}%)</span><span>{formatCurrency(calculations.tcsAmount)}</span></div>
                                    )}
                                    {calculations.roundOff !== 0 && (
                                        <div className="flex justify-between text-muted-foreground"><span>Round Off</span><span>{calculations.roundOff.toFixed(2)}</span></div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span>{formatCurrency(calculations.grandTotal)}</span></div>
                                </div>
                            </div>
                            
                            {/* REMARKS */}
                            <Accordion type="single" collapsible defaultValue="remarks">
                                <AccordionItem value="remarks">
                                    <AccordionTrigger>Remarks</AccordionTrigger>
                                    <AccordionContent>
                                        <FormField control={form.control} name="remarks" render={({ field }) => (
                                            <Textarea placeholder="Add any notes for the customer..." {...field} />
                                        )} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            

                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{isEditMode ? 'Update' : 'Create'} Sales Voucher</Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
            <AddLedgerSheet
                open={isAddLedgerSheetOpen}
                onOpenChange={setIsAddLedgerSheetOpen}
                initialValues={addLedgerInitialValues}
                ledgers={mockLedgers}
                onLedgerCreated={handleLedgerCreated}
            />
            <AddItemSheet
                open={isAddItemSheetOpen}
                onOpenChange={setIsAddItemSheetOpen}
                initialValues={addItemInitialValues as Partial<ItemFormValues> | undefined}
                onItemCreated={handleItemCreated}
            />
        </>
    );
}
