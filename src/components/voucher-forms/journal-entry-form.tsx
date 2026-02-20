'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockLedgers } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

const lineItemSchema = z.object({
  ledgerId: z.string().min(1, 'Ledger is required.'),
  type: z.enum(['Dr', 'Cr']),
  amount: z.coerce.number().min(0.01, 'Amount must be > 0'),
});

const journalEntrySchema = z.object({
  date: z.date(),
  reference: z.string().optional(),
  narration: z.string().min(1, "Narration is required."),
  lineItems: z.array(lineItemSchema).min(2, "At least two entries are required."),
}).refine(data => {
    const totalDebit = data.lineItems.filter(li => li.type === 'Dr').reduce((sum, li) => sum + li.amount, 0);
    const totalCredit = data.lineItems.filter(li => li.type === 'Cr').reduce((sum, li) => sum + li.amount, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for floating point inaccuracies
}, {
    message: "Total Debits must equal Total Credits.",
    path: ["lineItems"],
});

type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

const defaultValues: JournalEntryFormValues = {
  date: new Date(),
  reference: '',
  narration: '',
  lineItems: [
    { ledgerId: '', type: 'Dr', amount: 0 },
    { ledgerId: '', type: 'Cr', amount: 0 },
  ],
};

export function JournalEntryForm() {
    const { toast } = useToast();
    const form = useForm<JournalEntryFormValues>({
        resolver: zodResolver(journalEntrySchema),
        defaultValues,
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'lineItems',
    });
    
    const transactionalLedgers = React.useMemo(() => mockLedgers.filter(l => !l.isGroup), []);

    const watchedLineItems = form.watch('lineItems');

    const totalDebit = watchedLineItems.filter(li => li.type === 'Dr').reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
    const totalCredit = watchedLineItems.filter(li => li.type === 'Cr').reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
    const difference = totalDebit - totalCredit;

    function onSubmit(data: JournalEntryFormValues) {
        console.log(data);
        toast({
            title: "Journal Entry Posted",
            description: "The journal voucher has been successfully saved.",
        });
        form.reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Journal Entry</CardTitle>
                        <CardDescription>For adjustments, provisions, and other non-cash/bank transactions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <FormField control={form.control} name="date" render={({ field }) => (
                               <FormItem className="flex flex-col pt-2"><FormLabel className='mb-2'>Date</FormLabel>
                                   <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                   </Popover><FormMessage /></FormItem>
                           )} />
                            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div>
                          <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Dr/Cr</TableHead>
                                    <TableHead className="w-2/5">Particulars (Ledger)</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                             <FormField control={form.control} name={`lineItems.${index}.type`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="Dr">Dr</SelectItem><SelectItem value="Cr">Cr</SelectItem></SelectContent>
                                                </Select>
                                             )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.ledgerId`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Ledger" /></SelectTrigger></FormControl>
                                                <SelectContent>{transactionalLedgers.map(l => <SelectItem key={l.id} value={l.id}>{l.ledgerName}</SelectItem>)}</SelectContent>
                                                </Select>
                                            )} />
                                        </TableCell>
                                        <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.amount`} render={({ field }) => (
                                                <Input type="number" {...field} className="text-right" disabled={form.getValues(`lineItems.${index}.type`) === 'Cr'} />
                                            )} />
                                        </TableCell>
                                         <TableCell>
                                            <FormField control={form.control} name={`lineItems.${index}.amount`} render={({ field }) => (
                                                <Input type="number" {...field} className="text-right" disabled={form.getValues(`lineItems.${index}.type`) === 'Dr'} />
                                            )} />
                                        </TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2}>Total</TableCell>
                                    <TableCell className="text-right font-medium">{totalDebit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{totalCredit.toFixed(2)}</TableCell>
                                    <TableCell />
                                </TableRow>
                                {Math.abs(difference) > 0.01 && (
                                     <TableRow>
                                        <TableCell colSpan={2}></TableCell>
                                        <TableCell colSpan={2} className="text-right text-destructive font-medium">
                                            Difference: {Math.abs(difference).toFixed(2)}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                )}
                            </TableFooter>
                          </Table>
                          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ ledgerId: '', type: 'Dr', amount: Math.abs(difference) > 0.01 && difference < 0 ? Math.abs(difference) : 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line
                          </Button>
                        </div>
                        <FormField control={form.control} name="narration" render={({ field }) => (<FormItem><FormLabel>Narration</FormLabel><FormControl><Textarea placeholder="Being adjustment entry passed for..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        {form.formState.errors.lineItems && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {form.formState.errors.lineItems.message || "Please check the line items."}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>Post Entry</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
