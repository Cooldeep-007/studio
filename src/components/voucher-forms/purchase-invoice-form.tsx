'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, X, Sparkles, Building, Hash, Percent, FileText, Phone, Mail, AlertTriangle } from 'lucide-react';
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
import type { Ledger, Item, InvoiceItem, Company, Voucher, LedgerGroup, VoucherEntry } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { AddItemSheet } from '@/components/add-item-sheet';
import { indianStates, gstStateCodes } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLedgerSheet } from '../add-ledger-sheet';
import { VoucherNumberSettings } from '../voucher-number-settings';
import { useVoucherNumbering } from '@/hooks/use-voucher-numbering';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Qty > 0'),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).max(100).optional(),
});

const purchaseInvoiceSchema = z.object({
  invoiceDate: z.date(),
  supplierInvoiceNo: z.string().min(1, "Supplier invoice number is required."),
  supplierLedgerId: z.string().min(1, 'Supplier is required.'),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  isGstApplicable: z.boolean().default(true),
  isReverseCharge: z.boolean().default(false),
  adjustment: z.coerce.number().default(0),
  remarks: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

type FormValues = z.infer<typeof purchaseInvoiceSchema>;
type ItemFormValues = z.infer<typeof lineItemSchema>;

const defaultValues: Partial<FormValues> = {
    invoiceDate: new Date(),
    supplierInvoiceNo: '',
    isGstApplicable: true,
    isReverseCharge: false,
    adjustment: 0,
    remarks: "",
    items: [{ itemId: '', quantity: 1, rate: 0, discount: 0 }],
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

interface PurchaseInvoiceFormProps {
    initialData?: Voucher;
    companyId: string;
    firmId: string;
}

export function PurchaseInvoiceForm({ initialData, companyId, firmId }: PurchaseInvoiceFormProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [ledgers, setLedgers] = React.useState<Ledger[]>(() => mockLedgers);
    const [items, setItems] = React.useState<Item[]>(() => mockItems);
    const [company] = React.useState<Company | undefined>(() => mockCompanies.find(c => c.id === companyId));
    const isEditMode = !!initialData;

    const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);
    const [addLedgerInitialValues, setAddLedgerInitialValues] = React.useState<Partial<Ledger> | undefined>();
    const [isAddItemSheetOpen, setIsAddItemSheetOpen] = React.useState(false);
    const [addItemInitialValues, setAddItemInitialValues] = React.useState<Partial<ItemFormValues> | undefined>();
    const [activeItemIndex, setActiveItemIndex] = React.useState(0);
    const numbering = useVoucherNumbering(firmId, companyId, 'Purchase');

    const form = useForm<FormValues>({
        resolver: zodResolver(purchaseInvoiceSchema),
        defaultValues,
    });
    
    const supplierId = useWatch({ control: form.control, name: 'supplierLedgerId' });
    const selectedSupplier = React.useMemo(() => ledgers.find(l => l.id === supplierId), [supplierId, ledgers]);

    React.useEffect(() => {
        if (selectedSupplier?.contactDetails?.state) {
            form.setValue('placeOfSupply', selectedSupplier.contactDetails.state);
        }
    }, [selectedSupplier, form]);
    
    React.useEffect(() => {
        if (isEditMode && initialData?.invoiceDetails) {
            form.reset({
                invoiceDate: initialData.date instanceof Date ? initialData.date : (initialData.date as any).toDate(),
                supplierLedgerId: initialData.partyLedgerId,
                supplierInvoiceNo: initialData.referenceNumber,
                placeOfSupply: initialData.invoiceDetails.placeOfSupply,
                isGstApplicable: true,
                isReverseCharge: initialData.invoiceDetails.isReverseCharge,
                remarks: initialData.narration,
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

    const supplierOptions = ledgers
        .filter(l => l.group === 'Sundry Creditor' && !l.isGroup)
        .map(l => ({ value: l.id, label: l.ledgerName }));

    const itemOptions = items.map(i => ({ value: i.id, label: i.name }));
    
    const handleLedgerCreate = (searchValue: string) => {
        const sundryCreditorsGroup = ledgers.find(l => l.ledgerName === 'Sundry Creditors' && l.isGroup);
        setAddLedgerInitialValues({
            ledgerName: searchValue,
            parentLedgerId: sundryCreditorsGroup?.id,
            group: 'Sundry Creditor',
        });
        setIsAddLedgerSheetOpen(true);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setLedgers(prev => [...prev, newLedger]);
        if (newLedger.group === 'Sundry Creditor') {
            form.setValue('supplierLedgerId', newLedger.id, { shouldValidate: true });
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
        let totalDiscount = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const companyState = company?.gstin ? gstStateCodes[company.gstin.substring(0, 2)] : undefined;
        const isIntraState = watchedForm.placeOfSupply && companyState && watchedForm.placeOfSupply === companyState;
        
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
        const adjustment = watchedForm.adjustment || 0;
        const invoiceTotal = subtotal + totalGst + adjustment;
        
        const isTdsApplicable = selectedSupplier?.tdsTcsConfig?.tdsEnabled ?? false;
        const tdsRate = selectedSupplier?.tdsTcsConfig?.tdsRate ?? 0;
        const tdsAmount = isTdsApplicable ? (subtotal * tdsRate) / 100 : 0;
        const netPayable = invoiceTotal - tdsAmount;
        
        const roundedTotal = Math.round(invoiceTotal);
        const roundOff = roundedTotal - invoiceTotal;

        return { 
            items: processedItems, 
            subtotal, 
            totalDiscount, 
            totalCgst, 
            totalSgst, 
            totalIgst, 
            totalGst, 
            adjustment,
            grandTotal: roundedTotal, 
            roundOff, 
            isIntraState, 
            tdsAmount, 
            netPayable,
            isTdsApplicable,
            tdsRate,
            tdsNatureOfPayment: selectedSupplier?.tdsTcsConfig?.tdsNatureOfPayment,
            tdsSection: selectedSupplier?.tdsTcsConfig?.tdsSection,
        };
    }, [watchedForm, items, company, selectedSupplier]);


    async function onSubmit(data: FormValues) {
         if (!firestore) return;
        // TODO: Implement edit mode
        if (isEditMode) {
             toast({
                title: `Purchase Invoice Updated`,
                description: "The purchase voucher has been successfully updated.",
            });
            return;
        }

        const {
            items: calculatedItems, 
            grandTotal,
            totalCgst,
            totalSgst,
            totalIgst,
            subtotal,
            totalDiscount,
            adjustment,
            roundOff
        } = calculations;

        // Find necessary ledgers
        const cgstLedger = ledgers.find(l => l.ledgerName === "CGST");
        const sgstLedger = ledgers.find(l => l.ledgerName === "SGST");
        const igstLedger = ledgers.find(l => l.ledgerName === "IGST");
        
        let purchaseLedgerEntries: { ledgerId: string, amount: number }[] = [];

        calculatedItems.forEach(item => {
            const fullItem = items.find(i => i.id === item.itemId);
            if (!fullItem?.expenseLedgerId) return;

            const existingEntry = purchaseLedgerEntries.find(e => e.ledgerId === fullItem.expenseLedgerId);
            if (existingEntry) {
                existingEntry.amount += item.amount;
            } else {
                purchaseLedgerEntries.push({ ledgerId: fullItem.expenseLedgerId, amount: item.amount });
            }
        });


        let entries: Omit<VoucherEntry, 'id'>[] = [
            ...purchaseLedgerEntries.map(entry => ({ ledgerId: entry.ledgerId, type: 'Dr' as 'Dr', amount: entry.amount })),
        ];

        if (totalCgst > 0 && cgstLedger) entries.push({ ledgerId: cgstLedger.id, type: 'Dr', amount: totalCgst });
        if (totalSgst > 0 && sgstLedger) entries.push({ ledgerId: sgstLedger.id, type: 'Dr', amount: totalSgst });
        if (totalIgst > 0 && igstLedger) entries.push({ ledgerId: igstLedger.id, type: 'Dr', amount: totalIgst });
        
        entries.push({ ledgerId: data.supplierLedgerId, type: 'Cr', amount: grandTotal });
        

        const newVoucher: Omit<Voucher, 'id'> = {
            voucherNumber: numbering.mode === 'auto' ? await numbering.claimNextNumber() : (numbering.manualNumber || `PUR-${Date.now().toString().slice(-6)}`),
            voucherType: 'Purchase',
            date: data.invoiceDate,
            createdAt: serverTimestamp(),
            narration: data.remarks || `Purchase from ${selectedSupplier?.ledgerName}`,
            partyLedgerId: data.supplierLedgerId,
            referenceNumber: data.supplierInvoiceNo,
            entries,
            totalDebit: grandTotal,
            totalCredit: grandTotal,
            firmId,
            companyId,
            createdByUserId: 'user-123', // Replace with actual user ID from auth
            isReconciled: false,
            isCancelled: false,
            invoiceDetails: {
                items: calculatedItems,
                subtotal: subtotal,
                totalDiscount: totalDiscount,
                totalGst: calculations.totalGst,
                adjustment: adjustment,
                roundOff: roundOff,
                grandTotal: grandTotal,
                placeOfSupply: data.placeOfSupply,
                isReverseCharge: data.isReverseCharge,
            },
            status: 'Unpaid',
            outstandingAmount: grandTotal,
        };
        
        try {
            const isFirestoreSpecial = (v: any) => v instanceof Date || (typeof v === 'object' && v !== null && (typeof v.toDate === 'function' || '_methodName' in v));
            const removeUndefined = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(removeUndefined);
                if (isFirestoreSpecial(obj)) return obj;
                const cleaned: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== undefined) {
                        cleaned[key] = typeof value === 'object' && value !== null && !isFirestoreSpecial(value)
                            ? removeUndefined(value)
                            : value;
                    }
                }
                return cleaned;
            };
            const cleanedVoucher = removeUndefined(newVoucher);
            const vouchersColRef = collection(firestore, 'firms', firmId, 'companies', companyId, 'vouchers');
            await addDoc(vouchersColRef, cleanedVoucher);
            toast({
                title: `Purchase Invoice Created`,
                description: 'The purchase voucher has been successfully saved.',
            });
            form.reset();
        } catch (error) {
            console.error(error);
             toast({
                variant: 'destructive',
                title: `Error`,
                description: `Failed to create purchase voucher.`,
            });
        }
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEditMode ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</CardTitle>
                            <CardDescription>
                                <VoucherNumberSettings {...numbering} isEditMode={isEditMode} editVoucherNumber={initialData?.voucherNumber} />
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* HEADER */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <FormField control={form.control} name="supplierLedgerId" render={({ field }) => (
                                    <FormItem className="md:col-span-2 flex flex-col"><FormLabel>Supplier <span className="text-destructive">*</span></FormLabel>
                                    <Combobox 
                                        options={supplierOptions} 
                                        {...field} 
                                        placeholder="Select supplier..."
                                        searchPlaceholder="Search or create supplier..."
                                        onCreate={handleLedgerCreate}
                                    />
                                    <FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Purchase Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                                 <FormField control={form.control} name="supplierInvoiceNo" render={({ field }) => (<FormItem><FormLabel>Supplier Bill No. <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>

                            {selectedSupplier && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <Card className="p-4">
                                        <h4 className="font-semibold mb-2 text-foreground">Supplier Address</h4>
                                        <p>{selectedSupplier.contactDetails?.addressLine1}</p>
                                        <p>{selectedSupplier.contactDetails?.city}, {selectedSupplier.contactDetails?.state} - {selectedSupplier.contactDetails?.pincode}</p>
                                        <p className="mt-2 flex items-center gap-2"><FileText className="h-4 w-4" />GSTIN: <span className="font-mono">{selectedSupplier.gstDetails?.gstin || 'N/A'}</span></p>
                                        <p className="flex items-center gap-2"><Hash className="h-4 w-4" />PAN: <span className="font-mono">{selectedSupplier.contactDetails?.pan || 'N/A'}</span></p>
                                    </Card>
                                     <Card className="p-4">
                                        <h4 className="font-semibold mb-2 text-foreground">Contact Details</h4>
                                        <p className="flex items-center gap-2"><Building className="h-4 w-4" />{selectedSupplier.ledgerName}</p>
                                        {selectedSupplier.contactDetails?.contactPerson && <p>{selectedSupplier.contactDetails.contactPerson}</p>}
                                        <p className="mt-2 flex items-center gap-2"><Phone className="h-4 w-4" />{selectedSupplier.contactDetails?.mobileNumber || 'N/A'}</p>
                                        <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{selectedSupplier.contactDetails?.email || 'N/A'}</p>
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
                                        </div>
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
                            <div className="flex justify-between items-start gap-6">
                               <div className="w-1/2 space-y-4">
                                     <FormField control={form.control} name="remarks" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Remarks</FormLabel>
                                            <Textarea placeholder="Any notes related to the purchase..." {...field} />
                                        </FormItem>
                                     )} />
                               </div>
                                <div className="w-full max-w-sm space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal + calculations.totalDiscount)}</span></div>
                                    <div className="flex justify-between"><span>Discount</span><span className="text-red-600">-{formatCurrency(calculations.totalDiscount)}</span></div>
                                    <Separator />
                                    <div className="flex justify-between font-medium"><span>Taxable Value</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                                    {calculations.isIntraState ? (
                                        <>
                                            <div className="flex justify-between text-muted-foreground"><span>Input CGST</span><span>{formatCurrency(calculations.totalCgst)}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span>Input SGST</span><span>{formatCurrency(calculations.totalSgst)}</span></div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between text-muted-foreground"><span>Input IGST</span><span>{formatCurrency(calculations.totalIgst)}</span></div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Adjustment (+/-)</span>
                                        <FormField control={form.control} name="adjustment" render={({ field }) => (
                                            <Input type="number" step="0.01" placeholder="0.00" className="w-28 h-7 text-right text-sm" {...field} onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                                        )} />
                                    </div>
                                    {calculations.roundOff !== 0 && (
                                        <div className="flex justify-between text-muted-foreground"><span>Round Off</span><span>{calculations.roundOff.toFixed(2)}</span></div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span>{formatCurrency(calculations.grandTotal)}</span></div>
                                    
                                    {/* TDS DETAILS (INFORMATIONAL) */}
                                    {calculations.isTdsApplicable && calculations.tdsAmount > 0 && (
                                        <div className="mt-2 pt-2 border-t border-dashed">
                                            <div className="flex justify-between text-blue-600">
                                                <span className="font-medium">TDS ({calculations.tdsRate}%)</span>
                                                <span>-{formatCurrency(calculations.tdsAmount)}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-blue-700">
                                                <span>Net Payable</span>
                                                <span>{formatCurrency(calculations.netPayable)}</span>
                                            </div>
                                            <p className="text-xs text-right text-blue-500">(at time of payment)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{isEditMode ? 'Update' : 'Create'} Purchase Voucher</Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
            <AddLedgerSheet
                open={isAddLedgerSheetOpen}
                onOpenChange={setIsAddLedgerSheetOpen}
                initialValues={addLedgerInitialValues}
                ledgers={ledgers}
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
