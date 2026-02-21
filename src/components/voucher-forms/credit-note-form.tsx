'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers, mockItems } from '@/lib/data';
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

const lineItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  itemType: z.enum(['Goods', 'Services']),
  hsnSacCode: z.string().optional(),
  quantity: z.coerce.number().optional(),
  uqc: z.string().optional(),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
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

const creditNoteSchema = z.object({
  customerLedgerId: z.string().min(1, "Customer is required."),
  gstin: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  
  originalInvoiceNo: z.string().min(1, "Original invoice number is required."),
  originalInvoiceDate: z.date(),
  creditNoteDate: z.date(),
  
  reasonLedgerId: z.string().min(1, "A reason account (e.g. Sales Return) is required."),
  
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),
  
  narration: z.string().optional(),

}).refine(data => !data.creditNoteDate || !data.originalInvoiceDate || data.creditNoteDate >= data.originalInvoiceDate, {
  message: "Credit note date cannot be before the original invoice date.",
  path: ["creditNoteDate"],
});


type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

const newLineItemDefault = { 
  itemId: '',
  itemType: 'Goods' as 'Goods' | 'Services',
  hsnSacCode: '',
  quantity: 1, 
  uqc: '', 
  rate: 0, 
  gstRate: 0,
};

const defaultValues: CreditNoteFormValues = {
  customerLedgerId: '',
  gstin: '',
  placeOfSupply: '',
  originalInvoiceNo: '',
  reasonLedgerId: '',
  creditNoteDate: new Date(),
  originalInvoiceDate: new Date(),
  lineItems: [newLineItemDefault],
  narration: '',
};

export function CreditNoteForm() {
    const { toast } = useToast();
    const form = useForm<CreditNoteFormValues>({
        resolver: zodResolver(creditNoteSchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });

    const { watch, setValue, getValues, trigger, reset } = form;

    const customerLedgers = React.useMemo(() => mockLedgers.filter(l => l.group === 'Sundry Debtor'), []);
    const reasonLedgers = React.useMemo(() => mockLedgers.filter(l => l.ledgerName === 'Sales Return'), []);

    const companyState = "Karnataka";

    const lineItems = watch('lineItems');
    const placeOfSupply = watch('placeOfSupply');
    const partyLedgerId = watch('customerLedgerId');
    
    const handleItemSelect = (itemId: string, index: number) => {
        const selectedItem = mockItems.find(item => item.id === itemId);
        if (selectedItem) {
            const currentLineItems = getValues('lineItems');
            const currentItem = currentLineItems[index];

            currentItem.itemType = selectedItem.type;
            currentItem.hsnSacCode = selectedItem.type === 'Goods' ? selectedItem.hsnCode : selectedItem.sacCode;
            currentItem.rate = selectedItem.unitPrice;
            (currentItem as any).gstRate = selectedItem.gstRate;
            
            if (selectedItem.type === 'Goods') {
                currentItem.uqc = selectedItem.uqc;
                if (currentItem.quantity === undefined || currentItem.quantity === 0) {
                  currentItem.quantity = 1;
                }
            } else { // It's a service
                currentItem.quantity = 1;
                currentItem.uqc = undefined;
            }
            setValue('lineItems', currentLineItems);
            trigger('lineItems');
        }
    };

     React.useEffect(() => {
        const party = customerLedgers.find(c => c.id === partyLedgerId);
        if (party) {
            setValue('gstin', party.gstDetails?.gstin || '');
            if(party.contactDetails?.state) {
              setValue('placeOfSupply', party.contactDetails.state, { shouldValidate: true });
            }
        }
    }, [partyLedgerId, setValue, customerLedgers]);

    const { totalTaxableAmount, totalGst, grandTotal } = React.useMemo(() => {
        let subTotal = 0;
        let totalGst = 0;

        lineItems.forEach(item => {
            const quantity = item.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
            const rate = Number(item.rate) || 0;
            const gstRate = Number((item as any).gstRate) || 0;
            
            const taxableValue = quantity * rate;
            const gstAmount = taxableValue * (gstRate / 100);

            subTotal += taxableValue;
            totalGst += gstAmount;
        });
        
        return {
            totalTaxableAmount: subTotal,
            totalGst: totalGst,
            grandTotal: subTotal + totalGst
        };
    }, [lineItems]);
    
    const isIntraState = placeOfSupply === companyState;
    const cgst = isIntraState ? totalGst / 2 : 0;
    const sgst = isIntraState ? totalGst / 2 : 0;
    const igst = !isIntraState ? totalGst : 0;

    function onSubmit(data: CreditNoteFormValues) {
        const finalData = {
            ...data,
            totalTaxableAmount,
            totalGst,
            cgst,
            sgst,
            igst,
            grandTotal,
        };

        console.log(finalData);
        toast({
            title: "Credit Note Created",
            description: `Credit Note against invoice ${data.originalInvoiceNo} has been saved.`,
        });
        reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Credit Note (Sales Return)</CardTitle>
                        <CardDescription>Issue a credit note to a customer for returned goods or other reasons.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField
                                control={form.control}
                                name="customerLedgerId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer (To Credit)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger></FormControl>
                                    <SelectContent>{customerLedgers.map(c => <SelectItem key={c.id} value={c.id}>{c.ledgerName}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField control={form.control} name="gstin" render={({ field }) => (<FormItem><FormLabel>Customer GSTIN</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>)} />
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
                             <FormField control={form.control} name="creditNoteDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Credit Note Date</FormLabel>
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
                                    return (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.itemId`} render={({ field }) => (
                                                <Select onValueChange={(value) => { field.onChange(value); handleItemSelect(value, index); }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger></FormControl>
                                                    <SelectContent>{mockItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            )} />
                                        </TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.hsnSacCode`} render={({ field }) => ( <Input {...field} readOnly /> )} /></TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => ( 
                                                <Input type="number" {...field} disabled={currentItemType !== 'Goods'} /> 
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.uqc`} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value} disabled={currentItemType !== 'Goods'}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                                            </Select>)} />
                                        </TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.rate`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.gstRate`} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={(field.value as any)?.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                        <TableCell className="text-right">
                                            {(() => {
                                                const item = lineItems[index];
                                                if (!item) return '0.00';
                                                const quantity = item.itemType === 'Goods' ? (Number(item.quantity) || 0) : 1;
                                                const rate = Number(item.rate) || 0;
                                                const taxableValue = quantity * rate;
                                                const gstRate = Number((item as any).gstRate) || 0;
                                                const gstAmount = taxableValue * (gstRate / 100);
                                                const total = taxableValue + gstAmount;
                                                return total.toFixed(2);
                                            })()}
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
                                        <FormLabel>Reason (Account to Debit)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="e.g., Sales Return" /></SelectTrigger></FormControl>
                                        <SelectContent>{reasonLedgers.map(l => <SelectItem key={l.id} value={l.id}>{l.ledgerName}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="narration" render={({ field }) => (<FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being credit note raised for goods returned..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                           <div className="w-full space-y-2 self-end">
                                <div className="flex justify-between"><span>Taxable Value</span><span>{totalTaxableAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Output CGST Reversal</span><span>{cgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Output SGST Reversal</span><span>{sgst.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Output IGST Reversal</span><span>{igst.toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Total Credit Note Value</span><span>{grandTotal.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Save Credit Note</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
