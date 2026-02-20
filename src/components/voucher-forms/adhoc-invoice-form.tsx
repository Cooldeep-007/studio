'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import { indianStates, gstRates } from '@/lib/constants';
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
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  sacCode: z.string().optional(),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  gstRate: z.coerce.number().min(0),
  cgst: z.coerce.number(),
  sgst: z.coerce.number(),
  igst: z.coerce.number(),
  total: z.coerce.number(),
});

const adhocInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required.'),
  invoiceDate: z.date(),
  partyLedgerId: z.string().min(1, "Customer/Party is required."),
  placeOfSupply: z.string().min(1, 'Place of supply is required.'),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required."),
  totalTaxableAmount: z.coerce.number(),
  totalGst: z.coerce.number(),
  grandTotal: z.coerce.number(),
  narration: z.string().optional(),
});

type AdhocInvoiceFormValues = z.infer<typeof adhocInvoiceSchema>;

const defaultValues: Partial<AdhocInvoiceFormValues> = {
  invoiceNumber: '',
  invoiceDate: new Date(),
  partyLedgerId: '',
  placeOfSupply: '',
  lineItems: [{ description: '', sacCode: '', amount: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }],
  totalTaxableAmount: 0,
  totalGst: 0,
  grandTotal: 0,
  narration: '',
};

export function AdhocInvoiceForm() {
    const { toast } = useToast();
    const form = useForm<AdhocInvoiceFormValues>({
        resolver: zodResolver(adhocInvoiceSchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });

    const partyLedgers = React.useMemo(() => mockLedgers.filter(l => l.group === 'Sundry Debtor' || l.group === 'Sundry Creditor'), []);
    const companyState = "Karnataka";

    const watchedLineItems = form.watch('lineItems');
    const placeOfSupply = form.watch('placeOfSupply');

    React.useEffect(() => {
        let subTotal = 0;
        let totalGst = 0;

        const updatedLineItems = watchedLineItems.map(item => {
            const amount = item.amount || 0;
            const gstRate = item.gstRate || 0;
            const gstAmount = amount * (gstRate / 100);
            let cgst = 0, sgst = 0, igst = 0;

            if (placeOfSupply === companyState) {
                cgst = gstAmount / 2;
                sgst = gstAmount / 2;
            } else {
                igst = gstAmount;
            }

            const total = amount + gstAmount;
            subTotal += amount;
            totalGst += gstAmount;
            return { ...item, cgst, sgst, igst, total };
        });

        if (JSON.stringify(updatedLineItems) !== JSON.stringify(watchedLineItems)) {
            form.setValue('lineItems', updatedLineItems, { shouldValidate: true });
        }
        
        const grandTotal = subTotal + totalGst;
        form.setValue('totalTaxableAmount', subTotal);
        form.setValue('totalGst', totalGst);
        form.setValue('grandTotal', grandTotal);
    }, [watchedLineItems, placeOfSupply, form, companyState]);
    
    function onSubmit(data: AdhocInvoiceFormValues) {
        console.log(data);
        toast({
            title: "Adhoc Invoice Created",
            description: `Invoice ${data.invoiceNumber} has been saved.`,
        });
        form.reset();
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Adhoc Invoice</CardTitle>
                        <CardDescription>For non-inventory services or miscellaneous billing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Voucher No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                             <FormField control={form.control} name="partyLedgerId" render={({ field }) => (<FormItem><FormLabel>Party</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Party"/></SelectTrigger></FormControl><SelectContent>{partyLedgers.map(c => <SelectItem key={c.id} value={c.id}>{c.ledgerName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="placeOfSupply" render={({ field }) => (<FormItem><FormLabel>Place of Supply</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl><SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2">Billing Details</h3>
                          <Table>
                            <TableHeader><TableRow><TableHead className="w-1/2">Description</TableHead><TableHead>SAC</TableHead><TableHead>Amount</TableHead><TableHead>GST%</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => ( <Input {...field} placeholder="Service description"/> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.sacCode`} render={({ field }) => ( <Input {...field} /> )} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`lineItems.${index}.amount`} render={({ field }) => ( <Input type="number" {...field} /> )} /></TableCell>
                                         <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.gstRate`} render={({ field }) => (
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{gstRates.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                                                </Select>)} />
                                        </TableCell>
                                        <TableCell className="text-right">{form.getValues(`lineItems.${index}.total`).toFixed(2)}</TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ description: '', sacCode: '', amount: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line
                          </Button>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                           <FormField control={form.control} name="narration" render={({ field }) => (<FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being services rendered..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <div className="w-full space-y-2 self-end">
                                <div className="flex justify-between"><span>Taxable Amount</span><span>{form.getValues('totalTaxableAmount').toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>CGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.cgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>SGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.sgst, 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><span>IGST</span><span>{watchedLineItems.reduce((acc, item) => acc + item.igst, 0).toFixed(2)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Total Value</span><span>{form.getValues('grandTotal').toFixed(2)}</span></div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting}>Save Adhoc Invoice</Button></CardFooter>
                </Card>
            </form>
        </Form>
    )
}
