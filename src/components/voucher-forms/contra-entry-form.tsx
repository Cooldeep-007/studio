'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import type { Voucher } from '@/lib/types';
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

const contraEntrySchema = z.object({
  date: z.date(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  fromAccountId: z.string().min(1, "Please select the source account."),
  toAccountId: z.string().min(1, "Please select the destination account."),
  narration: z.string().optional(),
  referenceNumber: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
    message: "From and To accounts cannot be the same.",
    path: ["toAccountId"],
});


type FormValues = z.infer<typeof contraEntrySchema>;

interface ContraEntryFormProps {
    initialData?: Voucher;
}

export function ContraEntryForm({ initialData }: ContraEntryFormProps) {
    const { toast } = useToast();
    const [ledgers] = React.useState(() => mockLedgers.filter(l => !l.isGroup));
    const isEditMode = !!initialData;

    const form = useForm<FormValues>({
        resolver: zodResolver(contraEntrySchema),
        defaultValues: {
            date: new Date(),
            amount: 0,
            fromAccountId: '',
            toAccountId: '',
            narration: '',
            referenceNumber: '',
        },
    });
    
    React.useEffect(() => {
        if (initialData) {
            form.reset({
                date: new Date(initialData.date),
                amount: initialData.totalDebit,
                narration: initialData.narration,
                referenceNumber: initialData.referenceNumber,
                fromAccountId: initialData.entries.find(e => e.type === 'Cr')?.ledgerId || '',
                toAccountId: initialData.entries.find(e => e.type === 'Dr')?.ledgerId || '',
            });
        }
    }, [initialData, form]);

    const bankCashLedgerOptions = React.useMemo(() => 
        ledgers
            .filter(l => l.group === 'Bank Accounts' || l.ledgerName === 'Cash in Hand')
            .map(l => ({ value: l.id, label: l.ledgerName })),
        [ledgers]
    );

    function onSubmit(data: FormValues) {
        toast({
            title: `Contra Voucher ${isEditMode ? 'Updated' : 'Created'}`,
            description: "The fund transfer has been successfully recorded.",
        });
        console.log("Form Submitted", data);
        if (!isEditMode) {
            form.reset();
        }
    }

    const { fromAccountId, toAccountId, amount } = form.watch();
    const fromAccount = ledgers.find(l => l.id === fromAccountId);
    const toAccount = ledgers.find(l => l.id === toAccountId);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditMode ? 'Edit Contra Entry' : 'Contra Entry'}</CardTitle>
                        <CardDescription>Record a transfer between your cash and bank accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                           <FormField control={form.control} name="date" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="referenceNumber" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <FormField control={form.control} name="fromAccountId" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>From Account <span className="text-destructive">*</span></FormLabel>
                                    <Combobox options={bankCashLedgerOptions} value={field.value} onChange={field.onChange} placeholder="Select Source Account..." />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <ArrowRightLeft className="h-6 w-6 text-muted-foreground hidden md:block" />
                            <FormField control={form.control} name="toAccountId" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>To Account <span className="text-destructive">*</span></FormLabel>
                                    <Combobox options={bankCashLedgerOptions} value={field.value} onChange={field.onChange} placeholder="Select Destination Account..." />
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
                        <FormField control={form.control} name="narration" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Narration</FormLabel>
                                <FormControl><Textarea placeholder={`Being amount transferred...`} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        {fromAccount && toAccount && amount > 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    This will <span className="font-semibold text-red-600">Credit {fromAccount.ledgerName}</span> and <span className="font-semibold text-green-600">Debit {toAccount.ledgerName}</span> by {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>{isEditMode ? 'Update' : 'Post'} Contra</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
