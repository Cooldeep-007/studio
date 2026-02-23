'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '../ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const paymentReceiptSchema = z.object({
  date: z.date(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  partyLedgerId: z.string().min(1, "Please select a party ledger."),
  bankCashLedgerId: z.string().min(1, "Please select a bank or cash account."),
  narration: z.string().optional(),
  referenceNumber: z.string().optional(),
  paymentMode: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.date().optional(),
});

type FormValues = z.infer<typeof paymentReceiptSchema>;

interface PaymentReceiptFormProps {
    type: 'Payment' | 'Receipt';
}

export function PaymentReceiptForm({ type }: PaymentReceiptFormProps) {
    const { toast } = useToast();
    const [ledgers] = React.useState(() => mockLedgers.filter(l => !l.isGroup));

    const form = useForm<FormValues>({
        resolver: zodResolver(paymentReceiptSchema),
        defaultValues: {
            date: new Date(),
            amount: 0,
            partyLedgerId: '',
            bankCashLedgerId: '',
            narration: '',
            referenceNumber: '',
        },
    });

    const paymentMode = form.watch('paymentMode');

    const partyLedgerOptions = React.useMemo(() => 
        ledgers
            .filter(l => l.group !== 'Bank Accounts' && l.ledgerName !== 'Cash in Hand')
            .map(l => ({ value: l.id, label: l.ledgerName })), 
        [ledgers]
    );

    const bankCashLedgerOptions = React.useMemo(() => 
        ledgers
            .filter(l => l.group === 'Bank Accounts' || l.ledgerName === 'Cash in Hand')
            .map(l => ({ value: l.id, label: l.ledgerName })),
        [ledgers]
    );

    function onSubmit(data: FormValues) {
        toast({
            title: `${type} Voucher Created`,
            description: "The voucher has been successfully saved.",
        });
        console.log("Form Submitted", data);
        // Here you would typically call a server action to save the voucher to Firestore
        // For now, we just log it and show a toast.
        form.reset();
    }

    const partyLabel = type === 'Payment' ? 'Paid To' : 'Received From';
    const accountLabel = type === 'Payment' ? 'Paid From' : 'Received In';

    const { partyLedgerId, bankCashLedgerId, amount } = form.watch();
    const partyLedger = ledgers.find(l => l.id === partyLedgerId);
    const bankCashLedger = ledgers.find(l => l.id === bankCashLedgerId);
    
    const debitLedger = type === 'Payment' ? partyLedger : bankCashLedger;
    const creditLedger = type === 'Payment' ? bankCashLedger : partyLedger;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{type} Voucher</CardTitle>
                        <CardDescription>Record a {type.toLowerCase()} transaction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                           <FormField control={form.control} name="date" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="partyLedgerId" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{partyLabel} <span className="text-destructive">*</span></FormLabel>
                                    <Combobox options={partyLedgerOptions} value={field.value} onChange={field.onChange} placeholder={`Select ${partyLabel}...`} />
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="bankCashLedgerId" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{accountLabel} <span className="text-destructive">*</span></FormLabel>
                                    <Combobox options={bankCashLedgerOptions} value={field.value} onChange={field.onChange} placeholder="Select Bank/Cash..." />
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Accordion type="single" collapsible>
                            <AccordionItem value="more-details">
                                <AccordionTrigger>More Details</AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="paymentMode" render={({ field }) => (
                                            <FormItem><FormLabel>Payment Mode</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Mode" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {['Card', 'Cheque', 'NEFT/RTGS', 'UPI', 'Cash'].map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="referenceNumber" render={({ field }) => (<FormItem><FormLabel>Reference Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     </div>
                                     {paymentMode === 'Cheque' && (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                                             <FormField control={form.control} name="chequeNumber" render={({ field }) => (<FormItem><FormLabel>Cheque Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <FormField control={form.control} name="chequeDate" render={({ field }) => (
                                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Cheque Date</FormLabel>
                                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                                   </Popover><FormMessage /></FormItem>
                                           )} />
                                         </div>
                                     )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <FormField control={form.control} name="narration" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Narration</FormLabel>
                                <FormControl><Textarea placeholder={`Being ${type.toLowerCase()} made...`} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {debitLedger && creditLedger && amount > 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    This will <span className="font-semibold text-red-600">Debit {debitLedger.ledgerName}</span> and <span className="font-semibold text-green-600">Credit {creditLedger.ledgerName}</span> by {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Post {type}</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
