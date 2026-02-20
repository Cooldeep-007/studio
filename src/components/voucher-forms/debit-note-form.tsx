'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';

const debitNoteSchema = z.object({
  supplierLedgerId: z.string().min(1, "Supplier is required."),
  creditLedgerId: z.string().min(1, "Credit account is required."),
  originalInvoiceNo: z.string().min(1, "Original invoice number is required."),
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be positive."),
  reason: z.string().min(1, "Reason is required."),
  narration: z.string().optional(),
});

type DebitNoteFormValues = z.infer<typeof debitNoteSchema>;

const defaultValues: Partial<DebitNoteFormValues> = {
  supplierLedgerId: '',
  creditLedgerId: '',
  originalInvoiceNo: '',
  date: new Date(),
  amount: 0,
  reason: '',
  narration: '',
};

export function DebitNoteForm() {
    const { toast } = useToast();
    const form = useForm<DebitNoteFormValues>({
        resolver: zodResolver(debitNoteSchema),
        defaultValues,
        mode: 'onChange',
    });

    const supplierLedgers = React.useMemo(() => mockLedgers.filter(l => l.group === 'Sundry Creditor'), []);
    const creditLedgers = React.useMemo(() => mockLedgers.filter(l => l.group === 'Expense'), []);


    function onSubmit(data: DebitNoteFormValues) {
        console.log(data);
        toast({
            title: "Debit Note Created",
            description: `Debit Note against invoice ${data.originalInvoiceNo} has been saved.`,
        });
        form.reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Debit Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="supplierLedgerId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier (Debit)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select Supplier" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {supplierLedgers.map(c => <SelectItem key={c.id} value={c.id}>{c.ledgerName}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="creditLedgerId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason Account (Credit)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="e.g., Purchase Return" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {creditLedgers.map(l => <SelectItem key={l.id} value={l.id}>{l.ledgerName}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel className='mb-2'>Debit Note Date</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="originalInvoiceNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Original Invoice No.</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reason for Debit Note</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a reason" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Purchase Return">Purchase Return</SelectItem>
                                                <SelectItem value="Rate Difference">Rate Difference</SelectItem>
                                                <SelectItem value="Correction of Invoice">Correction of Invoice</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="narration"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Narration</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Being debit note raised for..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Save Debit Note</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
