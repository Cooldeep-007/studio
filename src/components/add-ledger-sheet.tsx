"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import type { Ledger, LedgerGroup } from "@/lib/types";
import {
  Percent, ShieldCheck, Landmark, HeartPulse, Sparkles, FolderKanban, Bot, Puzzle
} from "lucide-react";
import { cn } from "@/lib/utils";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
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
    
    // Statutory Tab
    gstApplicable: z.boolean().default(false),
    gstDetails: z.object({
        gstType: z.enum(['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Export']).optional(),
        gstin: z.string().optional(),
        gstRate: z.coerce.number().optional(),
        hsnCode: z.string().optional(),
    }).optional(),

    // Contact Tab
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
    
    // Advanced Tab
    tdsTcsConfig: z.object({
        tdsEnabled: z.boolean().default(false),
        tdsNatureOfPayment: z.string().optional(),
        tdsSection: z.string().optional(),
        tdsRate: z.coerce.number().optional(),
        tcsEnabled: z.boolean().default(false),
        tcsNature: z.string().optional(),
        tcsRate: z.coerce.number().optional(),
    }).optional(),

    gstAdvancedConfig: z.object({
        reverseCharge: z.boolean().default(false),
        itcEligibility: z.enum(['Eligible', 'Ineligible', 'As per Rules']).optional(),
        eInvoiceRequired: z.boolean().default(false),
    }).optional(),

    costCenterConfig: z.object({
        enabled: z.boolean().default(false),
    }).optional(),

    creditControl: z.object({
        creditLimit: z.coerce.number().optional(),
        creditPeriod: z.coerce.number().optional(),
        interestRate: z.coerce.number().optional(),
        riskCategory: z.enum(['Low', 'Medium', 'High']).optional(),
    }).optional(),

    automationRules: z.object({
        autoRoundOff: z.boolean().default(false),
        autoReminder: z.boolean().default(false),
    }).optional(),

    bankDetails: z.object({
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        bankName: z.string().optional(),
        defaultPaymentMode: z.enum(['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque']).optional(),
    }).optional(),

    complianceConfig: z.object({
        approvalRequired: z.boolean().default(false),
        enableAuditTrail: z.boolean().default(true),
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
            ledgerName: "",
            parentLedgerId: "",
            isGroup: false,
            ledgerCode: "",
            group: "",
            openingBalance: 0,
            balanceType: 'Dr',
            gstApplicable: false,
            gstDetails: {
                gstType: undefined,
                gstin: "",
                gstRate: 0,
                hsnCode: "",
            },
            contactDetails: {
                contactPerson: "",
                mobileNumber: "",
                email: "",
                addressLine1: "",
                city: "",
                state: "",
                pincode: "",
                pan: "",
            },
            tdsTcsConfig: {
                tdsEnabled: false,
                tdsNatureOfPayment: "",
                tdsSection: "",
                tdsRate: 0,
                tcsEnabled: false,
                tcsNature: "",
                tcsRate: 0
            },
            gstAdvancedConfig: {
                reverseCharge: false,
                itcEligibility: undefined,
                eInvoiceRequired: false,
            },
            costCenterConfig: {
                enabled: false,
            },
            creditControl: {
                creditLimit: 0,
                creditPeriod: 0,
                interestRate: 0,
                riskCategory: undefined,
            },
            automationRules: {
                autoRoundOff: false,
                autoReminder: false,
            },
            bankDetails: {
                accountNumber: "",
                ifscCode: "",
                bankName: "",
                defaultPaymentMode: undefined
            },
            complianceConfig: {
                approvalRequired: false,
                enableAuditTrail: true,
            },
        },
    });

    const parentLedgerId = form.watch("parentLedgerId");
    const gstApplicable = form.watch("gstApplicable");
    const tdsEnabled = form.watch("tdsTcsConfig.tdsEnabled");
    const tcsEnabled = form.watch("tdsTcsConfig.tcsEnabled");
    
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
            <ScrollArea className="flex-grow pr-6 -mr-6">
            <TooltipProvider>
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
                <div className={cn(
                    "grid overflow-hidden transition-all duration-300 ease-in-out",
                    gstApplicable ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}>
                    <div className="min-h-0">
                        <div className="space-y-4 p-4 border rounded-md mt-4">
                            <h4 className="font-medium">GST Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <FormField
                                    control={form.control}
                                    name="gstDetails.gstType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>
                </div>
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
              <TabsContent value="advanced" className="space-y-1">
                 <Accordion type="multiple" className="w-full">
                    <AccordionItem value="tds-tcs">
                      <AccordionTrigger className="text-base"><Percent className="mr-2 h-5 w-5 text-primary" />TDS / TCS Configuration</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-6">
                        <FormField control={form.control} name="tdsTcsConfig.tdsEnabled" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable TDS Deduction</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )} />

                        <div className={cn("grid overflow-hidden transition-all duration-300 ease-in-out", tdsEnabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                          <div className="min-h-0">
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                              <FormField control={form.control} name="tdsTcsConfig.tdsNatureOfPayment" render={({ field }) => (
                                  <FormItem><FormLabel>Nature of Payment</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select nature..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="contractor">Payment to Contractor</SelectItem>
                                              <SelectItem value="professional">Fees for Professional Services</SelectItem>
                                              <SelectItem value="commission">Commission or Brokerage</SelectItem>
                                              <SelectItem value="rent">Rent</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </FormItem>)} />
                              <FormField control={form.control} name="tdsTcsConfig.tdsSection" render={({ field }) => (
                                  <FormItem><FormLabel>TDS Section</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="194C">194C - Contractor</SelectItem>
                                              <SelectItem value="194J">194J - Professional Fees</SelectItem>
                                              <SelectItem value="194H">194H - Commission</SelectItem>
                                              <SelectItem value="194I">194I - Rent</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </FormItem>)} />
                            </div>
                          </div>
                        </div>
                        
                        <FormField control={form.control} name="tdsTcsConfig.tcsEnabled" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable TCS Collection</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )} />

                        <div className={cn("grid overflow-hidden transition-all duration-300 ease-in-out", tcsEnabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                          <div className="min-h-0">
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                               <FormField control={form.control} name="tdsTcsConfig.tcsNature" render={({ field }) => (
                                   <FormItem><FormLabel>Nature of Collection</FormLabel>
                                       <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select nature..." /></SelectTrigger></FormControl>
                                           <SelectContent>
                                               <SelectItem value="scrap">Sale of Scrap</SelectItem>
                                               <SelectItem value="vehicle">Sale of Motor Vehicle (&gt; 10L)</SelectItem>
                                               <SelectItem value="goods">Sale of Goods (&gt; 50L)</SelectItem>
                                           </SelectContent>
                                       </Select>
                                   </FormItem>)} />
                               <FormField control={form.control} name="tdsTcsConfig.tcsRate" render={({ field }) => (<FormItem><FormLabel>TCS Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                            </div>
                          </div>
                        </div>

                      </AccordionContent>
                    </AccordionItem>

                    {(derivedGroup === 'Sundry Debtor' || derivedGroup === 'Sundry Creditor') && (
                    <AccordionItem value="credit-control">
                      <AccordionTrigger className="text-base"><HeartPulse className="mr-2 h-5 w-5 text-primary" />Credit & Risk Management</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="creditControl.creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="creditControl.creditPeriod" render={({ field }) => (<FormItem><FormLabel>Credit Period (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                             <FormField control={form.control} name="creditControl.interestRate" render={({ field }) => (<FormItem><FormLabel>Interest on Late Payment (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="creditControl.riskCategory" render={({ field }) => (<FormItem><FormLabel>Risk Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Risk"/></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></FormItem>)} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    )}

                    {derivedGroup === 'Bank Accounts' && (
                    <AccordionItem value="banking">
                      <AccordionTrigger className="text-base"><Landmark className="mr-2 h-5 w-5 text-primary" />Banking & Payments</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="bankDetails.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                             <FormField control={form.control} name="bankDetails.defaultPaymentMode" render={({ field }) => (<FormItem><FormLabel>Default Payment Mode</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Mode"/></SelectTrigger></FormControl><SelectContent>{['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    )}

                    <AccordionItem value="cost-center">
                      <AccordionTrigger className="text-base"><FolderKanban className="mr-2 h-5 w-5 text-primary" />Cost & Profit Centers</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-6">
                        <FormField control={form.control} name="costCenterConfig.enabled" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Cost Center Allocation</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )} />
                      </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="automation">
                      <AccordionTrigger className="text-base"><Sparkles className="mr-2 h-5 w-5 text-primary" />Automation Rules</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-6">
                          <FormField control={form.control} name="automationRules.autoRoundOff" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Auto Round Off</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                           <FormField control={form.control} name="automationRules.autoReminder" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Automatic Reminders</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="compliance">
                      <AccordionTrigger className="text-base"><ShieldCheck className="mr-2 h-5 w-5 text-primary" />Compliance & Audit</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-6">
                         <FormField control={form.control} name="complianceConfig.enableAuditTrail" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Audit Trail</FormLabel><FormDescription>Log every change to this ledger.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                         <FormField control={form.control} name="complianceConfig.approvalRequired" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Require Approval for Vouchers</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="custom-fields">
                      <AccordionTrigger className="text-base"><Puzzle className="mr-2 h-5 w-5 text-primary" />Custom Fields</AccordionTrigger>
                      <AccordionContent className="pt-4 text-center text-muted-foreground">
                        <p>Custom fields defined in Settings will appear here.</p>
                      </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="ai-insights" disabled>
                      <AccordionTrigger className="text-base"><Bot className="mr-2 h-5 w-5" />AI Insights & Smart Analysis</AccordionTrigger>
                      <AccordionContent>
                      </AccordionContent>
                    </AccordionItem>
                 </Accordion>
              </TabsContent>
            </Tabs>
            </TooltipProvider>
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
