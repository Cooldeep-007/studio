
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import type { Ledger, LedgerGroup } from "@/lib/types";
import {
  Percent, ShieldCheck, Landmark, HeartPulse, Sparkles, FolderKanban, Bot, Puzzle, Loader2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";


const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const gstStateCodes: { [key: string]: string } = {
  '37': 'Andhra Pradesh', '12': 'Arunachal Pradesh', '18': 'Assam', '10': 'Bihar', '22': 'Chhattisgarh',
  '30': 'Goa', '24': 'Gujarat', '06': 'Haryana', '02': 'Himachal Pradesh', '20': 'Jharkhand',
  '29': 'Karnataka', '32': 'Kerala', '23': 'Madhya Pradesh', '27': 'Maharashtra', '14': 'Manipur',
  '17': 'Meghalaya', '15': 'Mizoram', '13': 'Nagaland', '21': 'Odisha', '03': 'Punjab',
  '08': 'Rajasthan', '11': 'Sikkim', '33': 'Tamil Nadu', '36': 'Telangana', '16': 'Tripura',
  '09': 'Uttar Pradesh', '05': 'Uttarakhand', '19': 'West Bengal', '35': 'Andaman and Nicobar Islands',
  '04': 'Chandigarh', '26': 'Dadra and Nagar Haveli and Daman and Diu', '07': 'Delhi', '01': 'Jammu and Kashmir',
  '38': 'Ladakh', '31': 'Lakshadweep', '34': 'Puducherry',
};

const uqcList = [
    { code: 'BAG', description: 'Bags' },
    { code: 'BTL', description: 'Bottles' },
    { code: 'BOX', description: 'Box' },
    { code: 'BUN', description: 'Bunches' },
    { code: 'CAN', description: 'Cans' },
    { code: 'CTN', description: 'Cartons' },
    { code: 'DOZ', description: 'Dozen' },
    { code: 'KGS', description: 'Kilograms' },
    { code: 'LTR', description: 'Litres' },
    { code: 'MTR', description: 'Meters' },
    { code: 'NOS', description: 'Numbers' },
    { code: 'PAC', description: 'Packs' },
    { code: 'PCS', description: 'Pieces' },
    { code: 'PRS', description: 'Pairs' },
    { code: 'ROL', description: 'Rolls' },
    { code: 'SET', description: 'Sets' },
    { code: 'UNT', description: 'Units' },
];

const tdsConfigData = {
  interest: {
    section: '194A',
    label: 'Interest (other than securities)',
    deducteeTypeRequired: false,
    rates: [{ label: 'Interest (10%)', value: 10 }],
  },
  contractor: {
    section: '194C',
    label: 'Contractor Payment',
    deducteeTypeRequired: true,
    rates: [
      { label: 'Individual/HUF (1%)', value: 1, type: 'individual' },
      { label: 'Others (2%)', value: 2, type: 'other' },
    ],
  },
  insurance_commission: {
    section: '194D',
    label: 'Commission on Insurance',
    deducteeTypeRequired: false,
    rates: [{ label: 'Insurance Commission (5%)', value: 5 }],
  },
  commission: {
    section: '194H',
    label: 'Commission or Brokerage',
    deducteeTypeRequired: false,
    rates: [{ label: 'Commission/Brokerage (5%)', value: 5 }],
  },
  rent_land: {
      section: '194I',
      label: 'Rent - Land & Building',
      deducteeTypeRequired: false,
      rates: [{ label: 'Rent on Land/Building (10%)', value: 10 }]
  },
  rent_plant: {
      section: '194I',
      label: 'Rent - Plant & Machinery',
      deducteeTypeRequired: false,
      rates: [{ label: 'Rent on Plant/Machinery (2%)', value: 2 }]
  },
  professional: {
    section: '194J',
    label: 'Fees for Professional Services',
    deducteeTypeRequired: false,
    rates: [{ label: 'Professional Fees (10%)', value: 10 }],
  },
  technical: {
    section: '194J',
    label: 'Fees for Technical Services',
    deducteeTypeRequired: false,
    rates: [{ label: 'Technical Fees (10%)', value: 10 }],
  },
  director_fees: {
    section: '194J',
    label: 'Director Sitting Fees',
    deducteeTypeRequired: false,
    rates: [{ label: 'Director Fees (10%)', value: 10 }],
  },
  dividend: {
    section: '194',
    label: 'Dividend',
    deducteeTypeRequired: false,
    rates: [{ label: 'Dividend (10%)', value: 10 }],
  },
  lottery: {
    section: '194B',
    label: 'Winning from Lottery',
    deducteeTypeRequired: false,
    rates: [{ label: 'Lottery Winnings (30%)', value: 30 }],
  },
  ecommerce: {
    section: '194O',
    label: 'E-commerce Participant',
    deducteeTypeRequired: false,
    rates: [{ label: 'E-commerce (1%)', value: 1 }],
  },
  purchase_goods: {
    section: '194Q',
    label: 'Purchase of Goods > 50L',
    deducteeTypeRequired: false,
    rates: [{ label: 'Purchase of Goods (0.1%)', value: 0.1 }],
  },
};


const ledgerFormSchema = z.object({
    ledgerName: z.string().min(2, "Ledger name must be at least 2 characters."),
    parentLedgerId: z.string().min(1, "Parent ledger is required."),
    isGroup: z.boolean().default(false),
    ledgerCode: z.string().optional(),
    group: z.string().optional(),
    openingBalance: z.coerce.number().default(0),
    balanceType: z.enum(['Dr', 'Cr']).default('Dr'),
    
    // Statutory Tab
    gstApplicable: z.boolean().default(false),
    gstDetails: z.object({
        gstType: z.enum(['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Export']).optional(),
        gstin: z.string().optional(),
        gstRate: z.coerce.number().optional(),
        hsnCode: z.string().optional(),
        uqc: z.string().optional(),
        gstClassification: z.enum(['Goods', 'Services']).optional(),
    }).optional(),

    // Contact Tab
    contactDetails: z.object({
        contactPerson: z.string().optional(),
        mobileNumber: z.string().optional(),
        email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
        addressLine1: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        pan: z.string().optional().refine((val) => !val || panRegex.test(val), { message: "Invalid PAN format." }),
    }).optional(),
    
    // Advanced Tab
    tdsTcsConfig: z.object({
        tdsEnabled: z.boolean().default(false),
        tdsNatureOfPayment: z.string().optional(),
        tdsSection: z.string().optional(),
        tdsDeducteeType: z.enum(['individual', 'other']).optional(),
        tdsRate: z.coerce.number().optional(),
        tcsEnabled: z.boolean().default(false),
        tcsNatureOfCollection: z.string().optional(),
        tcsSection: z.string().optional(),
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
}).superRefine((data, ctx) => {
    if (data.gstApplicable) {
        if (data.gstDetails?.gstin && !gstRegex.test(data.gstDetails.gstin)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid GSTIN format. Should be 15 characters.", path: ["gstDetails.gstin"] });
        }
        if (!data.gstDetails?.gstType) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Registration Type is required.", path: ["gstDetails.gstType"] });
        }
        if (!data.contactDetails?.state) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required.", path: ["contactDetails.state"] });
        }
    }
    
    if (!data.gstDetails?.gstClassification && data.gstApplicable) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Type of Supply is required when GST is applicable.", path: ["gstDetails.gstClassification"] });
    }

    if (data.gstDetails?.gstClassification === 'Goods') {
        if (!data.gstDetails.hsnCode) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HSN Code is required.", path: ["gstDetails.hsnCode"] });
        } else if (!/^\d{4,8}$/.test(data.gstDetails.hsnCode)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "HSN must be 4, 6, or 8 digits.", path: ["gstDetails.hsnCode"] });
        }
        if (!data.gstDetails.uqc) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UQC is required for Goods.", path: ["gstDetails.uqc"] });
        }
    }
    if (data.gstDetails?.gstClassification === 'Services') {
        if (!data.gstDetails.hsnCode) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SAC Code is required.", path: ["gstDetails.hsnCode"] });
        } else if (!/^\d{4,8}$/.test(data.gstDetails.hsnCode)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SAC must be 4, 6, or 8 digits.", path: ["gstDetails.hsnCode"] });
        }
    }


    if (data.group === 'Bank Accounts') {
        if (!data.bankDetails?.accountNumber) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account Number is required for Bank Ledgers.", path: ["bankDetails.accountNumber"] });
        }
        if (!data.bankDetails?.ifscCode) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "IFSC Code is required for Bank Ledgers.", path: ["bankDetails.ifscCode"] });
        }
    }

    if (data.group === 'Sundry Debtor' || data.group === 'Sundry Creditor') {
        if (!data.contactDetails?.mobileNumber && !data.contactDetails?.email) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Either Mobile Number or Email is required for Parties.", path: ["contactDetails.mobileNumber"] });
        }
    }
});

type LedgerFormValues = z.infer<typeof ledgerFormSchema>;

const defaultValues: Partial<LedgerFormValues> = {
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
        gstRate: undefined,
        hsnCode: "",
        uqc: undefined,
        gstClassification: undefined,
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
        tdsNatureOfPayment: undefined,
        tdsSection: "",
        tdsDeducteeType: undefined,
        tdsRate: undefined,
        tcsEnabled: false,
        tcsNatureOfCollection: "",
        tcsSection: "",
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
};


export function AddLedgerSheet({
  open,
  onOpenChange,
  ledgers,
  onLedgerCreated,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgers: Ledger[];
  onLedgerCreated: (ledger: Ledger) => void;
  initialValues?: Partial<LedgerFormValues>;
}) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const parentLedgers = ledgers.filter(l => l.isGroup);

    const form = useForm<LedgerFormValues>({
        resolver: zodResolver(ledgerFormSchema),
        defaultValues,
    });
    
    React.useEffect(() => {
        if (open) {
          form.reset({ ...defaultValues, ...initialValues });
        }
    }, [open, initialValues, form]);


    const parentLedgerId = form.watch("parentLedgerId");
    const gstin = form.watch("gstDetails.gstin");
    const supplyType = form.watch("gstDetails.gstClassification");
    const gstApplicable = form.watch("gstApplicable");
    const tdsEnabled = form.watch('tdsTcsConfig.tdsEnabled');
    const natureOfPayment = form.watch('tdsTcsConfig.tdsNatureOfPayment');
    const deducteeType = form.watch('tdsTcsConfig.tdsDeducteeType');
    const pan = form.watch('contactDetails.pan');
    const isPanMissing = tdsEnabled && !pan;

    const selectedParent = React.useMemo(() => {
        return ledgers.find(l => l.id === parentLedgerId);
    }, [parentLedgerId, ledgers]);

    const derivedGroup = selectedParent?.group;

    React.useEffect(() => {
        form.setValue('group', derivedGroup);
    }, [derivedGroup, form]);

    React.useEffect(() => {
        if (gstin && gstRegex.test(gstin)) {
            const panFromGstin = gstin.substring(2, 12);
            form.setValue('contactDetails.pan', panFromGstin.toUpperCase(), { shouldValidate: true });
            const stateCode = gstin.substring(0, 2);
            const stateName = gstStateCodes[stateCode as keyof typeof gstStateCodes];
            if (stateName) {
                form.setValue('contactDetails.state', stateName, { shouldValidate: true });
            }
            form.clearErrors("gstDetails.gstin");
        }
    }, [gstin, form]);

    React.useEffect(() => {
        if (supplyType === 'Services') {
            form.setValue('gstDetails.uqc', undefined, { shouldValidate: true });
        }
    }, [supplyType, form]);

    // Main effect for TDS automation
    React.useEffect(() => {
        const clearTdsFields = () => {
            form.setValue('tdsTcsConfig.tdsNatureOfPayment', undefined);
            form.setValue('tdsTcsConfig.tdsSection', '');
            form.setValue('tdsTcsConfig.tdsDeducteeType', undefined);
            form.setValue('tdsTcsConfig.tdsRate', undefined);
        };

        if (!tdsEnabled) {
            clearTdsFields();
            return;
        }

        if (isPanMissing) {
            form.setValue('tdsTcsConfig.tdsRate', 20);
            return; 
        }

        const config = natureOfPayment ? tdsConfigData[natureOfPayment as keyof typeof tdsConfigData] : undefined;

        if (config) {
            form.setValue('tdsTcsConfig.tdsSection', config.section, { shouldValidate: true });
            
            // Reset deductee type if the new nature of payment doesn't require it
            if (!config.deducteeTypeRequired) {
                form.setValue('tdsTcsConfig.tdsDeducteeType', undefined);
            }

            if (config.deducteeTypeRequired) {
                const rate = config.rates.find(r => r.type === deducteeType)?.value;
                form.setValue('tdsTcsConfig.tdsRate', rate, { shouldValidate: true });
            } else if (config.rates.length === 1) {
                form.setValue('tdsTcsConfig.tdsRate', config.rates[0].value, { shouldValidate: true });
            } else {
                const currentRate = form.getValues('tdsTcsConfig.tdsRate');
                const isCurrentRateValid = config.rates.some(r => r.value === currentRate);
                if (!isCurrentRateValid) {
                     form.setValue('tdsTcsConfig.tdsRate', undefined);
                }
            }
        } else {
            form.setValue('tdsTcsConfig.tdsSection', '');
            form.setValue('tdsTcsConfig.tdsRate', undefined);
        }

    }, [tdsEnabled, isPanMissing, natureOfPayment, deducteeType, form]);

    async function onSubmit(data: LedgerFormValues) {
        setIsSubmitting(true);
        try {
            // Simulate duplicate check
            const isDuplicate = ledgers.some(
                (l) => l.ledgerName.toLowerCase().trim() === data.ledgerName.toLowerCase().trim()
            );

            if (isDuplicate) {
                toast({
                    variant: "destructive",
                    title: "Ledger already exists",
                    description: "A ledger with this name already exists in this company.",
                });
                return;
            }

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            const newLedger: Ledger = {
                id: `led-${new Date().getTime()}`,
                ledgerName: data.ledgerName,
                parentLedgerId: data.parentLedgerId,
                group: (derivedGroup || 'Assets') as LedgerGroup,
                isGroup: data.isGroup,
                openingBalance: data.openingBalance,
                currentBalance: data.openingBalance,
                balanceType: data.balanceType,
                gstApplicable: data.gstApplicable,
                status: 'Active',
                createdAt: new Date(),
                lastUpdatedAt: new Date(),
                firmId: 'firm-abc', // Mock data
                companyId: 'comp-001', // Mock data
                ledgerCode: data.ledgerCode,
                gstDetails: data.gstApplicable ? {
                  ...(data.gstDetails || {}),
                  ...(data.gstAdvancedConfig || {}),
                } : undefined,
                contactDetails: data.contactDetails,
                bankDetails: data.bankDetails,
                creditControl: data.creditControl,
                tdsTcsConfig: data.tdsTcsConfig,
                costCenterConfig: data.costCenterConfig,
                automationRules: data.automationRules,
                complianceConfig: data.complianceConfig,
            };

            onLedgerCreated(newLedger);

            toast({
                title: "Ledger Created Successfully",
                description: `${data.ledgerName} has been added to your Chart of Accounts.`,
            });
            onOpenChange(false);
            form.reset(defaultValues);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Failed to save ledger",
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
              <TabsContent value="general" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="ledgerName"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Ledger Name <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Sales Account" {...field} autoFocus/>
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
                                <FormLabel>Under (Parent Ledger) <span className="text-destructive">*</span></FormLabel>
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
              <TabsContent value="statutory" className="space-y-6 pt-4">
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
                <FormField
                    control={form.control}
                    name="gstDetails.gstClassification"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type of Supply {gstApplicable && <span className="text-destructive">*</span>}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select Supply Type"/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Goods">Goods</SelectItem>
                                    <SelectItem value="Services">Services</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
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
                                            <FormLabel>Registration Type <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select GST Type"/></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Export'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
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
                                                <Input placeholder="e.g., 29AABCU9511F1Z5" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gstDetails.gstRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST Rate (%)</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a rate" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">0% (Exempt/Nil)</SelectItem>
                                                    <SelectItem value="0.1">0.1%</SelectItem>
                                                    <SelectItem value="0.25">0.25%</SelectItem>
                                                    <SelectItem value="3">3%</SelectItem>
                                                    <SelectItem value="5">5%</SelectItem>
                                                    <SelectItem value="12">12%</SelectItem>
                                                    <SelectItem value="18">18%</SelectItem>
                                                    <SelectItem value="28">28%</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {supplyType === 'Goods' && (
                                    <FormField
                                        control={form.control}
                                        name="gstDetails.uqc"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>UQC {gstApplicable && <span className="text-destructive">*</span>}</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select UQC" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {uqcList.map(u => <SelectItem key={u.code} value={u.code}>{u.code} - {u.description}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="gstDetails.hsnCode"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>
                                                {supplyType === 'Goods' ? 'HSN Code' : (supplyType === 'Services' ? 'SAC Code' : 'HSN/SAC Code')}
                                                {(gstApplicable && (supplyType === 'Goods' || supplyType === 'Services')) && <span className="text-destructive"> *</span>}
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
              </TabsContent>
              
              {/* CONTACT TAB */}
              <TabsContent value="contact" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactDetails.contactPerson" render={({ field }) => (<FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.email" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.addressLine1" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input placeholder="Address Line 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField
                        control={form.control}
                        name="contactDetails.state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>State {gstApplicable && <span className="text-destructive">*</span>}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="contactDetails.pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactDetails.pan" render={({ field }) => (<FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} readOnly={!!gstin && gstRegex.test(gstin)} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>)} />
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
                          <div className="min-h-0 space-y-4">
                            {isPanMissing && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Higher TDS Rate Applicable</AlertTitle>
                                    <AlertDescription>
                                        A 20% TDS rate is applied because the PAN is not available.
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                               <FormField 
                                    control={form.control} 
                                    name="tdsTcsConfig.tdsNatureOfPayment" 
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nature of Payment</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select nature..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {Object.entries(tdsConfigData).map(([key, config]) => (
                                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                              <FormField control={form.control} name="tdsTcsConfig.tdsSection" render={({ field }) => (
                                  <FormItem><FormLabel>TDS Section</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )} />
                                {natureOfPayment && tdsConfigData[natureOfPayment as keyof typeof tdsConfigData]?.deducteeTypeRequired && (
                                    <FormField control={form.control} name="tdsTcsConfig.tdsDeducteeType" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Deductee Type</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="individual" /></FormControl>
                                                        <FormLabel className="font-normal">Individual / HUF</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="other" /></FormControl>
                                                        <FormLabel className="font-normal">Others (Company, etc.)</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                                <FormField
                                    control={form.control}
                                    name="tdsTcsConfig.tdsRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>TDS Rate (%)</FormLabel>
                                            <Select 
                                                onValueChange={(val) => field.onChange(Number(val))} 
                                                value={field.value?.toString()}
                                                disabled={isPanMissing || (natureOfPayment && tdsConfigData[natureOfPayment as keyof typeof tdsConfigData]?.rates.length === 1) || (natureOfPayment === 'contractor' && !!deducteeType)}
                                            >
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select rate..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {isPanMissing ? (
                                                        <SelectItem value="20">20%</SelectItem>
                                                    ) : (
                                                        natureOfPayment && tdsConfigData[natureOfPayment as keyof typeof tdsConfigData]?.rates.map(rate => (
                                                            <SelectItem key={rate.value} value={rate.value.toString()}>{rate.label}</SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                          </div>
                        </div>
                        <Separator />
                         <FormField control={form.control} name="tdsTcsConfig.tcsEnabled" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable TCS Collection</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )} />

                        <div className={cn("grid overflow-hidden transition-all duration-300 ease-in-out", form.watch("tdsTcsConfig.tcsEnabled") ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                          <div className="min-h-0">
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                              <FormField control={form.control} name="tdsTcsConfig.tcsNatureOfCollection" render={({ field }) => (
                                  <FormItem><FormLabel>Nature of Collection</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select nature..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                               <SelectItem value="scrap">Sale of Scrap</SelectItem>
                                               <SelectItem value="vehicle">Sale of Motor Vehicle (&gt; 10L)</SelectItem>
                                               <SelectItem value="goods">Sale of Goods (&gt; 50L)</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>)} />
                              <FormField control={form.control} name="tdsTcsConfig.tcsSection" render={({ field }) => (
                                  <FormItem><FormLabel>TCS Section</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="206C_scrap">206C(1) - Scrap</SelectItem>
                                              <SelectItem value="206C_vehicle">206C(1F) - Motor Vehicle</SelectItem>
                                              <SelectItem value="206C_goods">206C(1H) - Sale of Goods</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>)} />
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
                            <FormField control={form.control} name="creditControl.creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="creditControl.creditPeriod" render={({ field }) => (<FormItem><FormLabel>Credit Period (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="creditControl.interestRate" render={({ field }) => (<FormItem><FormLabel>Interest on Late Payment (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="creditControl.riskCategory" render={({ field }) => (<FormItem><FormLabel>Risk Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Risk"/></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    )}

                    {derivedGroup === 'Bank Accounts' && (
                    <AccordionItem value="banking">
                      <AccordionTrigger className="text-base"><Landmark className="mr-2 h-5 w-5 text-primary" />Banking & Payments</AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="bankDetails.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="bankDetails.defaultPaymentMode" render={({ field }) => (<FormItem><FormLabel>Default Payment Mode</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Mode"/></SelectTrigger></FormControl><SelectContent>{['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Ledger"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
