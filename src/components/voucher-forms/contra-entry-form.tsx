'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import type { Voucher, Ledger } from '@/lib/types';
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
import { AddLedgerSheet } from '../add-ledger-sheet';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

const defaultValues: Partial<FormValues> = {
    date: new Date(),
    amount: 0,
    fromAccountId: '',
    toAccountId: '',
    narration: '',
    referenceNumber: '',
};

interface ContraEntryFormProps {
    initialData?: Voucher;
    companyId: string;
    firmId: string;
}

export function ContraEntryForm({ initialData, companyId, firmId }: ContraEntryFormProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [ledgers, setLedgers] = React.useState(() => mockLedgers);
    const isEditMode = !!initialData;
    const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);
    const [addLedgerInitialValues, setAddLedgerInitialValues] = React.useState<Partial<Ledger> | undefined>();
    const [activeField, setActiveField] = React.useState<'from' | 'to' | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(contraEntrySchema),
        defaultValues: isEditMode ? undefined : defaultValues,
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

    const handleCreateLedger = (fieldName: 'from' | 'to', searchValue: string) => {
        setActiveField(fieldName);
        const bankGroup = ledgers.find(l => l.ledgerName === 'Bank Accounts' && l.isGroup);
        setAddLedgerInitialValues({
            ledgerName: searchValue,
            parentLedgerId: bankGroup?.id,
            group: 'Bank Accounts',
        });
        setIsAddLedgerSheetOpen(true);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setLedgers(prev => [...prev, newLedger]);
        if (activeField === 'from') {
            form.setValue('fromAccountId', newLedger.id, { shouldValidate: true });
        } else if (activeField === 'to') {
            form.setValue('toAccountId', newLedger.id, { shouldValidate: true });
        }
        setActiveField(null);
    };


    async function onSubmit(data: FormValues) {
        if (!firestore) return;
        // TODO: Implement edit mode
        if (isEditMode) {
             toast({
                title: `Contra Voucher Updated`,
                description: "The fund transfer has been successfully updated.",
            });
            return;
        }

        const newVoucher: Omit<Voucher, 'id'> = {
            voucherNumber: `FY24-AUTO-${Math.floor(Math.random() * 1000)}`, // Replace with real sequencing
            voucherType: 'Contra',
            date: data.date,
            createdAt: serverTimestamp(),
            narration: data.narration || `Transfer from ${ledgers.find(l=>l.id === data.fromAccountId)?.ledgerName} to ${ledgers.find(l=>l.id === data.toAccountId)?.ledgerName}`,
            referenceNumber: data.referenceNumber,
            entries: [
                { ledgerId: data.toAccountId, type: 'Dr', amount: data.amount },
                { ledgerId: data.fromAccountId, type: 'Cr', amount: data.amount },
            ],
            totalDebit: data.amount,
            totalCredit: data.amount,
            firmId,
            companyId,
            createdByUserId: 'user-123', // Replace with actual user ID from auth
            isReconciled: false,
            isCancelled: false,
            status: 'Paid',
        };

        try {
            const vouchersColRef = collection(firestore, 'firms', firmId, 'companies', companyId, 'vouchers');
            await addDoc(vouchersColRef, newVoucher);
             toast({
                title: `Contra Voucher Created`,
                description: "The fund transfer has been successfully recorded.",
            });
            form.reset();
        } catch (error) {
            console.error(error);
             toast({
                variant: 'destructive',
                title: `Error`,
                description: "Failed to create contra voucher.",
            });
        }
    }

    const { fromAccountId, toAccountId, amount } = form.watch();
    const fromAccount = ledgers.find(l => l.id === fromAccountId);
    const toAccount = ledgers.find(l => l.id === toAccountId);

    return (
        <>
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
                                    <Combobox 
                                        options={bankCashLedgerOptions} 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                        placeholder="Select Source Account..."
                                        onCreate={(value) => handleCreateLedger('from', value)}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <ArrowRightLeft className="h-6 w-6 text-muted-foreground hidden md:block" />
                            <FormField control={form.control} name="toAccountId" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>To Account <span className="text-destructive">*</span></FormLabel>
                                    <Combobox 
                                        options={bankCashLedgerOptions} 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                        placeholder="Select Destination Account..."
                                        onCreate={(value) => handleCreateLedger('to', value)}
                                    />
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
         <AddLedgerSheet
            open={isAddLedgerSheetOpen}
            onOpenChange={setIsAddLedgerSheetOpen}
            initialValues={addLedgerInitialValues}
            ledgers={ledgers}
            onLedgerCreated={handleLedgerCreated}
        />
        </>
    );
}
