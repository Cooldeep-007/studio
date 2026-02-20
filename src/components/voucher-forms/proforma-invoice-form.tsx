'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
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
  itemName: z.string().min(1, 'Item name is required.'),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(0.001, 'Quantity must be > 0'),
  uqc: z.string().optional(),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  taxableValue: z.coerce.number(),
  gstRate: z.coerce.number().min(0),
  cgst: z.coerce.number(),
  sgst: z.coerce.number(),
  igst: z.coerce.number(),
  total: z.coerce.number(),
});

const proformaInvoiceSchema = z.object({
  proformaNumber: z.string().min(1, 'Proforma number is required.'),
  proformaDate: z.date(),
  partyLedgerId: z.string().min(1, "Customer is required."),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),
  totalTaxableAmount: z.coerce.number(),
  totalGst: z.coerce.number(),
  grandTotal: z.coerce.number(),
  terms: z.string().optional(),
});

type ProformaInvoiceFormValues = z.infer<typeof proformaInvoiceSchema>;

const defaultValues: Partial<ProformaInvoiceFormValues> = {
  proformaNumber: '',
  proformaDate: new Date(),
  partyLedgerId: '',
  placeOfSupply: '',
  lineItems: [{ itemName: '', hsnCode: '', quantity: 1, uqc: '', rate: 0, taxableValue: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }],
  totalTaxableAmount: 0,
  totalGst: 0,
  grandTotal: 0,
  terms: '',
};

export function ProformaInvoiceForm() {
    const { toast } = useToast();
    const form = useForm<ProformaInvoiceFormValues>({
        resolver: zodResolver(proformaInvoiceSchema),
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

    React.useEffect(() => {
        let subTotal = 0;
        let totalGst = 0;

        const updatedLineItems = watchedLineItems.map(item => {
            const quantity = item.quantity || 0;
            const rate = item.rate || 0;
            const gstRate = item.gstRate || 0;
            const taxableValue = quantity * rate;
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
        
        form.setValue('totalTaxableAmount', subTotal);
        form.setValue('totalGst', totalGst);
        form.setValue('grandTotal', subTotal + totalGst);
    }, [watchedLineItems, placeOfSupply, form, companyState]);
    
    function onSubmit(data: ProformaInvoiceFormValues) {
        console.log(data);
        toast({
            title: "Proforma Invoice Saved",
            description: `Proforma Invoice ${data.proformaNumber} has been saved as a draft.`,
        });
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <FormField control={form.control} name="proformaNumber" render={({ field }) => (<FormItem><FormLabel>Proforma No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="proformaDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                             <FormField control={form.control} name="partyLedgerId" render={({ field }) => (<FormItem><FormLabel>Customer</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Customer"/></SelectTrigger></FormControl><SelectContent>{customerLedgers.map(c => <SelectItem key={c.id} value={c.id}>{c.ledgerName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">Item Details</h3>
                          <Table>
                            <TableHeader><TableRow><TableHead className="w-[20%]">Item</TableHead><TableHead>HSN</TableHead><TableHead>Qty</TableHead><TableHead>UQC</TableHead><TableHead>Rate</TableHead><TableHead>GST%</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.itemName`} render={({ field }) => ( <Input {...field} placeholder="Item Name"/> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.hsnCode`} render={({ field }) => ( <Input {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.uqc`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.rate`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.gstRate`} render={({ field }) => (<Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                        <TableCell className="text-right">{form.getValues(`lineItems.${index}.total`).toFixed(2)}</TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ itemName: '', hsnCode: '', quantity: 1, uqc: '', rate: 0, taxableValue: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                           <FormField control={form.control} name="terms" render={({ field }) => (<FormItem><FormLabel>Terms & Conditions</FormLabel><FormControl><Textarea placeholder="Payment terms, delivery schedule, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <div className="w-full space-y-2 self-end">
                                <div className="flex justify-between"><span>Subtotal</span><span>{form.getValues('totalTaxableAmount').toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>CGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.cgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>SGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.sgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>IGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.igst, 0).toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{form.getValues('grandTotal').toFixed(2)}</span></div>
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
