'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers, mockVouchers } from '@/lib/data';
import type { Voucher, BillAllocation, Ledger } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '../ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BillAllocationDialog } from '../bill-allocation-dialog';
import { AddLedgerSheet } from '../add-ledger-sheet';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  billAllocations: z.array(z.object({
    voucherId: z.string(),
    voucherNumber: z.string(),
    amount: z.number(),
  })).optional(),
});

type FormValues = z.infer<typeof paymentReceiptSchema>;

const defaultValues: Partial<FormValues> = {
    date: new Date(),
    amount: 0,
    partyLedgerId: '',
    bankCashLedgerId: '',
    narration: '',
    referenceNumber: '',
    billAllocations: [],
};

interface PaymentReceiptFormProps {
    type: 'Payment' | 'Receipt';
    initialData?: Voucher;
    companyId: string;
    firmId: string;
}

export function PaymentReceiptForm({ type, initialData, companyId, firmId }: PaymentReceiptFormProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [ledgers, setLedgers] = React.useState(() => mockLedgers);
    const [outstandingVouchers, setOutstandingVouchers] = React.useState<Voucher[]>([]);
    const [isAllocationDialogOpen, setIsAllocationDialogOpen] = React.useState(false);
    const isEditMode = !!initialData;
    const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);
    const [addLedgerInitialValues, setAddLedgerInitialValues] = React.useState<Partial<Ledger> | undefined>();
    const [activeField, setActiveField] = React.useState<'party' | 'bank' | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(paymentReceiptSchema),
        defaultValues: isEditMode ? undefined : defaultValues,
    });

    React.useEffect(() => {
        if (initialData) {
            const bankCashLedger = initialData.entries.find(e => e.ledgerId !== initialData.partyLedgerId);
            form.reset({
                date: new Date(initialData.date),
                amount: initialData.totalDebit,
                partyLedgerId: initialData.partyLedgerId,
                bankCashLedgerId: bankCashLedger?.ledgerId,
                narration: initialData.narration,
                referenceNumber: initialData.referenceNumber,
                paymentMode: initialData.paymentMode,
                chequeNumber: initialData.chequeNumber,
                chequeDate: initialData.chequeDate ? new Date(initialData.chequeDate) : undefined,
                billAllocations: initialData.billAllocations,
            });
        }
    }, [initialData, form]);

    const paymentMode = form.watch('paymentMode');
    const partyLedgerId = form.watch('partyLedgerId');
    const amount = form.watch('amount');

    const selectedParty = React.useMemo(() => ledgers.find(l => l.id === partyLedgerId), [partyLedgerId, ledgers]);
    const isTdsApplicable = selectedParty?.tdsTcsConfig?.tdsEnabled && type === 'Payment';
    const tdsRate = selectedParty?.tdsTcsConfig?.tdsRate || 0;
    const tdsAmount = isTdsApplicable ? (amount * tdsRate) / 100 : 0;
    const netPayable = amount - tdsAmount;

    React.useEffect(() => {
        if (!partyLedgerId) {
            setOutstandingVouchers([]);
            return;
        }
        const partyLedger = ledgers.find(l => l.id === partyLedgerId);
        const isParty = partyLedger?.group === 'Sundry Debtor' || partyLedger?.group === 'Sundry Creditor';

        if (isParty) {
            const partyVouchers = mockVouchers.filter(
                v => (v.voucherType === 'Sales' || v.voucherType === 'Purchase') && v.partyLedgerId === partyLedgerId && (v.outstandingAmount ?? 0) > 0
            );
            setOutstandingVouchers(partyVouchers);
        } else {
            setOutstandingVouchers([]);
        }
    }, [partyLedgerId, ledgers]);

    const partyLedgerOptions = React.useMemo(() => {
        let filteredLedgers = ledgers.filter(l => l.group !== 'Bank Accounts' && l.ledgerName !== 'Cash in Hand');
        if (type === 'Payment') {
            filteredLedgers = filteredLedgers.filter(l => l.group !== 'Income');
        } else {
            filteredLedgers = filteredLedgers.filter(l => l.group !== 'Expense');
        }
        return filteredLedgers.map(l => ({ value: l.id, label: l.ledgerName }));
    }, [ledgers, type]);

    const bankCashLedgerOptions = React.useMemo(() => 
        ledgers
            .filter(l => l.group === 'Bank Accounts' || l.ledgerName === 'Cash in Hand')
            .map(l => ({ value: l.id, label: l.ledgerName })),
        [ledgers]
    );

    const handleCreateLedger = (fieldName: 'party' | 'bank', searchValue: string) => {
        setActiveField(fieldName);
        let initialGroup, parentId;

        if (fieldName === 'party') {
            initialGroup = type === 'Payment' ? 'Sundry Creditor' : 'Sundry Debtor';
            parentId = ledgers.find(l => l.ledgerName === (type === 'Payment' ? 'Sundry Creditors' : 'Sundry Debtors') && l.isGroup)?.id;
        } else { // bank
            initialGroup = 'Bank Accounts';
            parentId = ledgers.find(l => l.ledgerName === 'Bank Accounts' && l.isGroup)?.id;
        }
        
        setAddLedgerInitialValues({
            ledgerName: searchValue,
            parentLedgerId: parentId,
            group: initialGroup as any,
        });
        setIsAddLedgerSheetOpen(true);
    };

    const handleLedgerCreated = (newLedger: Ledger) => {
        setLedgers(prev => [...prev, newLedger]);
        if (activeField === 'party') {
            form.setValue('partyLedgerId', newLedger.id, { shouldValidate: true });
        } else if (activeField === 'bank') {
            form.setValue('bankCashLedgerId', newLedger.id, { shouldValidate: true });
        }
        setActiveField(null);
    };


    async function onSubmit(data: FormValues) {
        if (!firestore) return;
        // TODO: Implement edit mode
        if (isEditMode) {
            toast({
                title: `${type} Voucher Updated`,
                description: "The voucher has been successfully updated.",
            });
            return;
        }

        const newVoucher: Omit<Voucher, 'id'> = {
            voucherNumber: `FY24-AUTO-${Math.floor(Math.random() * 1000)}`, // Replace with real sequencing
            voucherType: type,
            date: data.date,
            createdAt: serverTimestamp(),
            narration: data.narration || `Amount ${type === 'Payment' ? 'paid to' : 'received from'} ${ledgers.find(l=>l.id === data.partyLedgerId)?.ledgerName}`,
            partyLedgerId: data.partyLedgerId,
            referenceNumber: data.referenceNumber,
            entries: [
                { ledgerId: type === 'Payment' ? data.partyLedgerId : data.bankCashLedgerId, type: 'Dr', amount: data.amount },
                { ledgerId: type === 'Payment' ? data.bankCashLedgerId : data.partyLedgerId, type: 'Cr', amount: data.amount },
            ],
            totalDebit: data.amount,
            totalCredit: data.amount,
            firmId,
            companyId,
            createdByUserId: 'user-123', // Replace with actual user ID from auth
            isReconciled: false,
            isCancelled: false,
            paymentMode: data.paymentMode as any,
            chequeNumber: data.chequeNumber,
            chequeDate: data.chequeDate,
            billAllocations: data.billAllocations,
            status: 'Paid', // Assuming full payment
        };
        
        try {
            const vouchersColRef = collection(firestore, 'firms', firmId, 'companies', companyId, 'vouchers');
            await addDoc(vouchersColRef, newVoucher);
            toast({
                title: `${type} Voucher Created`,
                description: "The voucher has been successfully saved.",
            });
            form.reset();
            setOutstandingVouchers([]);
        } catch (error) {
            console.error(error);
             toast({
                variant: 'destructive',
                title: `Error`,
                description: `Failed to create ${type} voucher.`,
            });
        }
    }
    
    const handleSaveAllocations = (allocations: BillAllocation[]) => {
        form.setValue('billAllocations', allocations, { shouldValidate: true });
        setIsAllocationDialogOpen(false);
    }

    const partyLabel = type === 'Payment' ? 'Paid To' : 'Received From';
    const accountLabel = type === 'Payment' ? 'Paid From' : 'Received In';

    const { bankCashLedgerId } = form.watch();
    const partyLedger = ledgers.find(l => l.id === partyLedgerId);
    const bankCashLedger = ledgers.find(l => l.id === bankCashLedgerId);
    
    const debitLedger = type === 'Payment' ? partyLedger : bankCashLedger;
    const creditLedger = type === 'Payment' ? bankCashLedger : partyLedger;

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEditMode ? `Edit ${type}` : type} Voucher</CardTitle>
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
                                        <Combobox 
                                            options={partyLedgerOptions} 
                                            value={field.value} 
                                            onChange={field.onChange} 
                                            placeholder={`Select ${partyLabel}...`}
                                            onCreate={(value) => handleCreateLedger('party', value)}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="bankCashLedgerId" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{accountLabel} <span className="text-destructive">*</span></FormLabel>
                                        <Combobox 
                                            options={bankCashLedgerOptions} 
                                            value={field.value} 
                                            onChange={field.onChange} 
                                            placeholder="Select Bank/Cash..."
                                            onCreate={(value) => handleCreateLedger('bank', value)}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <FormField control={form.control} name="amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gross Amount <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            {isTdsApplicable && amount > 0 && (
                                <Alert variant="default" className="bg-blue-50 border-blue-200">
                                    <Sparkles className="h-4 w-4 text-blue-500" />
                                    <AlertTitle className="text-blue-700">TDS Applicable</AlertTitle>
                                    <AlertDescription>
                                        <div className="flex justify-between items-center mt-2">
                                            <span>TDS on {selectedParty?.tdsTcsConfig?.tdsNatureOfPayment} @ {tdsRate}% (Sec {selectedParty?.tdsTcsConfig?.tdsSection}):</span>
                                            <span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tdsAmount)}</span>
                                        </div>
                                         <div className="flex justify-between items-center mt-2 font-bold">
                                            <span>Net Payable Amount:</span>
                                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netPayable)}</span>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {outstandingVouchers.length > 0 && amount > 0 && (
                                <div className='flex justify-end'>
                                    <Button type="button" variant="secondary" onClick={() => setIsAllocationDialogOpen(true)}>
                                        Allocate Bills
                                    </Button>
                                </div>
                            )}

                            <Accordion type="single" collapsible>
                                <AccordionItem value="more-details">
                                    <AccordionTrigger>More Details</AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="paymentMode" render={({ field }) => (
                                                <FormItem><FormLabel>Payment Mode</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                        This will <span className="font-semibold text-green-600">Debit {debitLedger.ledgerName}</span> and <span className="font-semibold text-red-600">Credit {creditLedger.ledgerName}</span> by {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={form.formState.isSubmitting}>{isEditMode ? 'Update' : 'Post'} {type}</Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
            <BillAllocationDialog
                open={isAllocationDialogOpen}
                onOpenChange={setIsAllocationDialogOpen}
                paymentAmount={amount}
                outstandingVouchers={outstandingVouchers}
                onSave={handleSaveAllocations}
            />
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
