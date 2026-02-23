
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Info } from 'lucide-react';
import type { Ledger, Voucher } from '@/lib/types';
import { Alert, AlertDescription } from './ui/alert';

const bankEntrySchema = z.object({
  voucherType: z.enum(['Payment', 'Receipt', 'Contra']),
  date: z.date(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  particularsLedgerId: z.string().min(1, 'Please select a particulars ledger.'),
  narration: z.string().optional(),
});

type BankEntryFormValues = z.infer<typeof bankEntrySchema>;

interface BankEntrySheetProps {
  children: React.ReactNode;
  bankLedger: Ledger;
  ledgers: Ledger[];
  onVoucherCreated: (voucher: Voucher) => void;
}

export function BankEntrySheet({ children, bankLedger, ledgers, onVoucherCreated }: BankEntrySheetProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<BankEntryFormValues>({
    resolver: zodResolver(bankEntrySchema),
    defaultValues: {
      voucherType: 'Payment',
      date: new Date(),
      amount: 0,
      particularsLedgerId: '',
      narration: '',
    },
  });

  const voucherType = form.watch('voucherType');

  const particularsOptions = React.useMemo<ComboboxOption[]>(() => {
    let filteredLedgers: Ledger[] = [];
    if (voucherType === 'Contra') {
      // For contra, only show other bank accounts or the cash account
      filteredLedgers = ledgers.filter(
        (l) => (l.group === 'Bank Accounts' || l.ledgerName === 'Cash in Hand') && l.id !== bankLedger.id && !l.isGroup
      );
    } else {
      // For payment/receipt, show all ledgers except bank/cash and the current bank account
      filteredLedgers = ledgers.filter(
        (l) => l.group !== 'Bank Accounts' && l.ledgerName !== 'Cash in Hand' && !l.isGroup
      );
    }
    return filteredLedgers.map((l) => ({ value: l.id, label: l.ledgerName }));
  }, [ledgers, bankLedger.id, voucherType]);

  const getParticularsLabel = () => {
    switch (voucherType) {
      case 'Receipt': return 'Received From';
      case 'Payment': return 'Paid To';
      case 'Contra': return 'Transfer To/From';
      default: return 'Particulars';
    }
  };

  const getVoucherNumber = (type: 'Payment' | 'Receipt' | 'Contra') => {
    const prefix = type.charAt(0);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  }

  async function onSubmit(data: BankEntryFormValues) {
    const particularsLedger = ledgers.find(l => l.id === data.particularsLedgerId);
    if (!particularsLedger) return;

    let entries: Voucher['entries'];
    if (data.voucherType === 'Payment') {
      entries = [
        { ledgerId: particularsLedger.id, type: 'Dr', amount: data.amount },
        { ledgerId: bankLedger.id, type: 'Cr', amount: data.amount },
      ];
    } else if (data.voucherType === 'Receipt') {
      entries = [
        { ledgerId: bankLedger.id, type: 'Dr', amount: data.amount },
        { ledgerId: particularsLedger.id, type: 'Cr', amount: data.amount },
      ];
    } else { // Contra
      entries = [
        { ledgerId: particularsLedger.id, type: 'Dr', amount: data.amount },
        { ledgerId: bankLedger.id, type: 'Cr', amount: data.amount },
      ];
    }

    const newVoucher: Voucher = {
      id: `vch-${new Date().getTime()}`,
      voucherNumber: getVoucherNumber(data.voucherType),
      voucherType: data.voucherType,
      date: data.date,
      createdAt: new Date(),
      narration: data.narration || `${data.voucherType} transaction`,
      entries,
      totalDebit: data.amount,
      totalCredit: data.amount,
      isReconciled: false,
      isCancelled: false,
      firmId: bankLedger.firmId,
      companyId: bankLedger.companyId,
      createdByUserId: 'user-123',
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    onVoucherCreated(newVoucher);
    setIsOpen(false);
    form.reset();
  }

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>New Bank Transaction</SheetTitle>
              <SheetDescription>
                Create a Payment, Receipt, or Contra entry for{' '}
                <span className="font-semibold text-primary">{bankLedger.ledgerName}</span>.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-grow py-6 space-y-4 overflow-y-auto pr-4 -mr-4">
              <FormField
                control={form.control}
                name="voucherType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voucher Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Payment">Payment</SelectItem>
                        <SelectItem value="Receipt">Receipt</SelectItem>
                        <SelectItem value="Contra">Contra (Bank/Cash Transfer)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="particularsLedgerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{getParticularsLabel()}</FormLabel>
                    <Combobox options={particularsOptions} value={field.value} onChange={field.onChange} placeholder="Select ledger..." />
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
                    <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="narration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Narration (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Add a brief description..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    {voucherType === 'Payment' && `This will credit ${bankLedger.ledgerName} and debit the selected ledger.`}
                    {voucherType === 'Receipt' && `This will debit ${bankLedger.ledgerName} and credit the selected ledger.`}
                    {voucherType === 'Contra' && `This will create a transfer entry between ${bankLedger.ledgerName} and the selected bank/cash account.`}
                </AlertDescription>
              </Alert>
            </div>
            <SheetFooter className="pt-4 mt-auto">
              <SheetClose asChild><Button type="button" variant="outline">Cancel</Button></SheetClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Transaction
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
