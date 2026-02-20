"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import type { Ledger, LedgerGroup } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

const ledgerFormSchema = z.object({
    ledgerName: z.string().min(2, "Ledger name must be at least 2 characters."),
    parentLedgerId: z.string().min(1, "Parent ledger is required."),
    isGroup: z.boolean().default(false),
    ledgerCode: z.string().optional(),
    group: z.string(), // This will be derived but needed for conditional logic
    openingBalance: z.coerce.number().default(0),
    balanceType: z.enum(['Dr', 'Cr']).default('Dr'),
    gstApplicable: z.boolean().default(false),
    gstDetails: z.object({
        gstType: z.enum(['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Export']).optional(),
        gstin: z.string().optional(),
        gstRate: z.coerce.number().optional(),
        hsnCode: z.string().optional(),
        placeOfSupply: z.string().optional(),
        reverseCharge: z.boolean().default(false),
    }).optional(),
    contactDetails: z.object({
        contactPerson: z.string().optional(),
        mobileNumber: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        addressLine1: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        pan: z.string().optional(),
    }).optional(),
    bankDetails: z.object({
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        bankName: z.string().optional(),
    }).optional(),
    creditControl: z.object({
        creditLimit: z.coerce.number().optional(),
        creditPeriod: z.coerce.number().optional(),
    }).optional(),
});

type LedgerFormValues = z.infer<typeof ledgerFormSchema>;

const ledgerGroups: LedgerGroup[] = ['Assets', 'Liabilities', 'Income', 'Expense', 'Sundry Debtor', 'Sundry Creditor', 'Bank Accounts'];


export function AddLedgerSheet({ children, ledgers }: { children: React.ReactNode; ledgers: Ledger[] }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const parentLedgers = ledgers.filter(l => l.isGroup);

    const form = useForm<LedgerFormValues>({
        resolver: zodResolver(ledgerFormSchema),
        defaultValues: {
            isGroup: false,
            openingBalance: 0,
            balanceType: 'Dr',
            gstApplicable: false,
        },
    });

    const parentLedgerId = form.watch("parentLedgerId");
    const gstApplicable = form.watch("gstApplicable");
    
    const selectedParent = React.useMemo(() => {
        return ledgers.find(l => l.id === parentLedgerId);
    }, [parentLedgerId, ledgers]);

    const derivedGroup = selectedParent?.group;

    function onSubmit(data: LedgerFormValues) {
        // In a real app, you would send this to your API
        console.log({ ...data, derivedGroup });
        toast({
            title: "Ledger Creation Payload",
            description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(data, null, 2)}</code></pre>,
        });
        setIsOpen(false);
        form.reset();
    }
    
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-2xl w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Create New Ledger</SheetTitle>
              <SheetDescription>
                Fill in the details to create a new ledger in your Chart of Accounts.
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
            <ScrollArea className="flex-grow pr-6">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="statutory">Statutory</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              {/* GENERAL TAB */}
              <TabsContent value="general" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ledgerName"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Ledger Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Sales Account" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="parentLedgerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Under (Parent Ledger)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a parent group" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {parentLedgers.map(p => <SelectItem key={p.id} value={p.id}>{p.ledgerName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel>Group</FormLabel>
                        <Input disabled value={derivedGroup || 'Select a parent first'} />
                    </FormItem>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="isGroup"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-2">
                                <div className="space-y-0.5">
                                    <FormLabel>Is a Group?</FormLabel>
                                    <FormDescription>
                                        Group ledgers are for classification and cannot have transactions.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                        />
                </div>
                <Separator />
                <h3 className="text-lg font-medium">Opening Balance</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="openingBalance"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="balanceType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Balance Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Dr">Debit (Dr)</SelectItem>
                                        <SelectItem value="Cr">Credit (Cr)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </TabsContent>

              {/* STATUTORY TAB */}
              <TabsContent value="statutory" className="space-y-6">
                <FormField
                    control={form.control}
                    name="gstApplicable"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Is GST Applicable?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                    />
                {gstApplicable && (
                    <div className="space-y-4 p-4 border rounded-md">
                        <h4 className="font-medium">GST Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="gstDetails.gstType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST Type</FormLabel>
                                        <Select onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select GST Type"/></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Export'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gstDetails.gstin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GSTIN</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 29AABCU9511F1Z5" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gstDetails.gstRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST Rate (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 18" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gstDetails.hsnCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>HSN/SAC Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )}
              </TabsContent>
              
              {/* CONTACT TAB */}
              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactDetails.contactPerson" render={({ field }) => (<FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.email" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.addressLine1" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input placeholder="Address Line 1" {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.pan" render={({ field }) => (<FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
              </TabsContent>
              
              {/* ADVANCED TAB */}
              <TabsContent value="advanced" className="space-y-6">
                {(derivedGroup === 'Sundry Debtor' || derivedGroup === 'Sundry Creditor') && (
                    <div className="space-y-4 p-4 border rounded-md">
                        <h4 className="font-medium">Credit Control</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="creditControl.creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="creditControl.creditPeriod" render={({ field }) => (<FormItem><FormLabel>Credit Period (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        </div>
                    </div>
                )}
                {derivedGroup === 'Bank Accounts' && (
                    <div className="space-y-4 p-4 border rounded-md">
                        <h4 className="font-medium">Bank Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="bankDetails.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                    </div>
                )}
                 <div className="text-center text-muted-foreground p-8">
                    TDS/TCS, Cost Center, and Custom Fields will be configured here.
                 </div>
              </TabsContent>
            </Tabs>
            </ScrollArea>
            <SheetFooter className="pt-4 mt-auto">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit">Save Ledger</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
