'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import { indianStates, uqcList, gstRates } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';

const lineItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(0.001, 'Quantity must be > 0'),
  uqc: z.string().optional(),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  discount: z.coerce.number().min(0).default(0),
  taxableValue: z.coerce.number(),
  gstRate: z.coerce.number().min(0),
  cgst: z.coerce.number(),
  sgst: z.coerce.number(),
  igst: z.coerce.number(),
  total: z.coerce.number(),
});

const salesInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required.'),
  invoiceDate: z.date(),
  dueDate: z.date(),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  eWayBillRequired: z.boolean().default(false),
  eInvoiceRequired: z.boolean().default(false),
  
  partyLedgerId: z.string().min(1, "Customer is required."),
  gstin: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),
  
  reverseCharge: z.boolean().default(false),
  tcsApplicable: z.boolean().default(false),
  
  totalTaxableAmount: z.coerce.number(),
  totalGst: z.coerce.number(),
  roundOff: z.coerce.number().optional(),
  grandTotal: z.coerce.number(),
  narration: z.string().optional(),
}).refine(data => !data.dueDate || !data.invoiceDate || data.dueDate >= data.invoiceDate, {
  message: "Due date cannot be before the invoice date.",
  path: ["dueDate"],
});

type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;

const defaultValues: Partial<SalesInvoiceFormValues> = {
  invoiceNumber: '',
  invoiceDate: undefined,
  dueDate: undefined,
  eWayBillRequired: false,
  eInvoiceRequired: false,
  lineItems: [
    { 
      itemName: '', 
      quantity: 1, 
      rate: 0, 
      discount: 0,
      gstRate: 0,
      hsnCode: '', uqc: '', taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 
    }
  ],
  totalTaxableAmount: 0,
  totalGst: 0,
  grandTotal: 0,
};

export function SalesInvoiceForm() {
    const { toast } = useToast();
    const form = useForm<SalesInvoiceFormValues>({
        resolver: zodResolver(salesInvoiceSchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });

    const customerLedgers = React.useMemo(() => mockLedgers.filter(l => l.group === 'Sundry Debtor'), []);
    const companyState = "Karnataka";

    const watchedLineItems = form.watch('lineItems');
    const placeOfSupply = form.watch('placeOfSupply');
    const partyLedgerId = form.watch('partyLedgerId');

    React.useEffect(() => {
        form.reset({
            ...defaultValues,
            invoiceNumber: `INV-${new Date().getTime()}`,
            invoiceDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            lineItems: defaultValues.lineItems || [],
        });
    }, [form]);

    React.useEffect(() => {
        const party = customerLedgers.find(c => c.id === partyLedgerId);
        if (party) {
            form.setValue('gstin', party.gstDetails?.gstin || '');
            form.setValue('billingAddress', party.contactDetails?.addressLine1 || '');
            form.setValue('shippingAddress', party.contactDetails?.addressLine1 || '');
            if(party.contactDetails?.state) {
              form.setValue('placeOfSupply', party.contactDetails.state, { shouldValidate: true });
            }
        }
    }, [partyLedgerId, form, customerLedgers]);

    React.useEffect(() => {
        if (!watchedLineItems) return;
        let subTotal = 0;
        let totalGst = 0;

        const updatedLineItems = watchedLineItems.map(item => {
            const quantity = item.quantity || 0;
            const rate = item.rate || 0;
            const discount = item.discount || 0;
            const gstRate = item.gstRate || 0;
            
            const taxableValue = quantity * rate - discount;
            const gstAmount = taxableValue * (gstRate / 100);

            let cgst = 0, sgst = 0, igst = 0;

            if (placeOfSupply === companyState) {
                cgst = gstAmount / 2;
                sgst = gstAmount / 2;
            } else {
                igst = gstAmount;
            }

            const total = taxableValue + gstAmount;

            subTotal += taxableValue;
            totalGst += gstAmount;
            
            return { ...item, taxableValue, cgst, sgst, igst, total };
        });

        if (JSON.stringify(updatedLineItems) !== JSON.stringify(watchedLineItems)) {
            form.setValue('lineItems', updatedLineItems, { shouldValidate: true });
        }
        
        const grandTotal = subTotal + totalGst;
        form.setValue('totalTaxableAmount', subTotal);
        form.setValue('totalGst', totalGst);
        form.setValue('grandTotal', grandTotal);

    }, [watchedLineItems, placeOfSupply, form, companyState]);
    
    
    function onSubmit(data: SalesInvoiceFormValues) {
        console.log(data);
        toast({
            title: "Sales Invoice Created",
            description: `Invoice ${data.invoiceNumber} has been saved.`,
        });
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Invoice Date</FormLabel>
                                   <Popover><PopoverTrigger asChild>
                                           <FormControl>
                                               <Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>
                                                   {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                   <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                               </Button>
                                           </FormControl>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start">
                                           <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                       </PopoverContent>
                                   </Popover>
                               <FormMessage /></FormItem>
                           )} />
                            <FormField control={form.control} name="dueDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Due Date</FormLabel>
                                   <Popover><PopoverTrigger asChild>
                                           <FormControl>
                                               <Button variant={"outline"} className={cn("pl-3 font-normal",!field.value && "text-muted-foreground")}>
                                                   {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                   <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                               </Button>
                                           </FormControl>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start">
                                           <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                       </PopoverContent>
                                   </Popover>
                               <FormMessage /></FormItem>
                           )} />
                             <FormField control={form.control} name="placeOfSupply" render={({ field }) => (
                                <FormItem><FormLabel>Place of Supply</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl>
                                    <SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="partyLedgerId" render={({ field }) => (
                                <FormItem><FormLabel>Customer</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Customer"/></SelectTrigger></FormControl>
                                    <SelectContent>{customerLedgers.map(c => <SelectItem key={c.id} value={c.id}>{c.ledgerName}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="gstin" render={({ field }) => (<FormItem><FormLabel>GSTIN</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="billingAddress" render={({ field }) => (<FormItem><FormLabel>Billing Address</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="shippingAddress" render={({ field }) => (<FormItem><FormLabel>Shipping Address</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">Item Details</h3>
                          <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[20%]">Item</TableHead>
                                    <TableHead>HSN</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>UQC</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>GST%</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                           <FormField control={form.control} name={`lineItems.${index}.itemName`} render={({ field }) => ( <Input {...field} placeholder="Item Name"/> )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.hsnCode`} render={({ field }) => ( <Input {...field} /> )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => ( <Input type="number" {...field} /> )} />
                                        </TableCell>
                                         <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.uqc`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent>
                                                </Select>)} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.rate`} render={({ field }) => ( <Input type="number" {...field} /> )} />
                                        </TableCell>
                                         <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.gstRate`} render={({ field }) => (
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                                                </Select>)} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                           {form.getValues(`lineItems.${index}.total`).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ itemName: '', quantity: 1, rate: 0, discount: 0, gstRate: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0, hsnCode: '', uqc: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                        </div>
                        
                        <Separator />

                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-4">
                                <div className="flex justify-between"><span>Subtotal</span><span>{form.getValues('totalTaxableAmount').toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>CGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.cgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>SGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.sgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>IGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.igst, 0).toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>{form.getValues('grandTotal').toFixed(2)}</span></div>
                            </div>
                        </div>

                         <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                 <FormField control={form.control} name="eWayBillRequired" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>E-Way Bill Required?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                                 <FormField control={form.control} name="eInvoiceRequired" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>E-Invoice Required?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                                 <FormField control={form.control} name="reverseCharge" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Reverse Charge?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                                 <FormField control={form.control} name="tcsApplicable" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>TCS Applicable?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )} />
                            </div>
                             <FormField control={form.control} name="narration" render={({ field }) => (<FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being sales made..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Save Invoice</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
