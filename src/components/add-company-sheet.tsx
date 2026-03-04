
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import type { Company, LedgerGroup } from "@/lib/types";
import { collection, addDoc, serverTimestamp, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";


import {
  Loader2,
  Building,
  Banknote,
  Percent,
  Briefcase,
  Landmark,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const companyFormSchema = z.object({
  // Basic Details
  companyName: z.string().min(1, "Company name is required."),
  mailingName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  pincode: z.string().length(6, "Pincode must be 6 digits.").optional().or(z.literal('')),
  telephone: z.string().optional(),
  mobileNumber: z.string().length(10, "Mobile number must be 10 digits.").optional().or(z.literal('')),
  email: z.string().email("Invalid email format.").optional().or(z.literal('')),
  website: z.string().url("Invalid URL format.").optional().or(z.literal('')),
  
  // Financial Details
  financialYearStart: z.date({ required_error: "Financial year start date is required."}),
  booksStart: z.date({ required_error: "Books beginning date is required."}),
  baseCurrencySymbol: z.string().default('₹'),
  formalCurrencyName: z.string().default('INR'),
  inventory: z.boolean().default(false),
  multiCurrency: z.boolean().default(false),
  
  // Tax Details
  gstApplicable: z.boolean().default(false),
  gstin: z.string().optional(),
  gstRegType: z.enum(['Regular', 'Composition', 'Unregistered']).optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),

  // Bank Details
  bankDetails: z.object({
    bankName: z.string().optional(),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    branchName: z.string().optional(),
  }).optional(),

}).superRefine((data, ctx) => {
    if (data.booksStart < data.financialYearStart) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Books cannot begin before the financial year.", path: ["booksStart"] });
    }
    if (data.gstApplicable) {
        if (!data.gstin || !gstRegex.test(data.gstin)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid 15-character GSTIN is required.", path: ["gstin"] });
        } else {
            // If GSTIN is valid, check if PAN matches
            const panFromGstin = data.gstin.substring(2, 12);
            if (data.pan !== panFromGstin) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PAN should be auto-filled and must match the PAN from GSTIN.", path: ["pan"] });
            }
        }
    }
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

const today = new Date();
const currentFinancialYearStart = new Date(
  today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1,
  3,
  1
);

const defaultValues: Partial<CompanyFormValues> = {
  companyName: "",
  mailingName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  pincode: "",
  telephone: "",
  mobileNumber: "",
  email: "",
  website: "",
  financialYearStart: currentFinancialYearStart,
  booksStart: currentFinancialYearStart,
  baseCurrencySymbol: "₹",
  formalCurrencyName: "INR",
  inventory: false,
  multiCurrency: false,
  gstApplicable: false,
  gstin: "",
  gstRegType: undefined,
  pan: "",
  tan: "",
  bankDetails: {
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
  },
};

const currentYear = new Date().getFullYear();
const financialYears = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear + 1 - i;
    return {
        label: `FY ${year}-${(year + 1).toString().slice(-2)}`,
        value: new Date(year, 3, 1),
    };
});

const defaultLedgerGroups = [
  // Primary
  { id: 'group-assets', ledgerName: 'Assets', group: 'Assets', nature: 'Asset' as const, parentLedgerId: null },
  { id: 'group-liabilities', ledgerName: 'Liabilities', group: 'Liabilities', nature: 'Liability' as const, parentLedgerId: null },
  { id: 'group-income', ledgerName: 'Income', group: 'Income', nature: 'Income' as const, parentLedgerId: null },
  { id: 'group-expense', ledgerName: 'Expenses', group: 'Expense', nature: 'Expense' as const, parentLedgerId: null },

  // Level 1 under Assets
  { id: 'group-current-assets', ledgerName: 'Current Assets', group: 'Current Assets', nature: 'Asset' as const, parentLedgerId: 'group-assets' },
  { id: 'group-fixed-assets', ledgerName: 'Fixed Assets', group: 'Assets', nature: 'Asset' as const, parentLedgerId: 'group-assets' },
  
  // Level 2 under Current Assets
  { id: 'group-bank-accounts', ledgerName: 'Bank Accounts', group: 'Bank Accounts', nature: 'Asset' as const, parentLedgerId: 'group-current-assets' },
  { id: 'group-cash-in-hand', ledgerName: 'Cash-in-Hand', group: 'Cash-in-Hand', nature: 'Asset' as const, parentLedgerId: 'group-current-assets' },
  { id: 'group-sundry-debtors', ledgerName: 'Sundry Debtors', group: 'Sundry Debtor', nature: 'Asset' as const, parentLedgerId: 'group-current-assets' },

  // Level 1 under Liabilities
  { id: 'group-current-liabilities', ledgerName: 'Current Liabilities', group: 'Liabilities', nature: 'Liability' as const, parentLedgerId: 'group-liabilities' },
  { id: 'group-capital-account', ledgerName: 'Capital Account', group: 'Liabilities', nature: 'Liability' as const, parentLedgerId: 'group-liabilities' },

  // Level 2 under Current Liabilities
  { id: 'group-sundry-creditors', ledgerName: 'Sundry Creditors', group: 'Sundry Creditor', nature: 'Liability' as const, parentLedgerId: 'group-current-liabilities' },
  { id: 'group-duties-taxes', ledgerName: 'Duties & Taxes', group: 'Liabilities', nature: 'Liability' as const, parentLedgerId: 'group-current-liabilities' },
  
  // Level 3 under Duties & Taxes
  { id: 'group-tds-payable', ledgerName: 'TDS Payable', group: 'Liabilities', nature: 'Liability' as const, parentLedgerId: 'group-duties-taxes' },

  // Level 1 under Income
  { id: 'group-sales-accounts', ledgerName: 'Sales Accounts', group: 'Income', nature: 'Income' as const, parentLedgerId: 'group-income' },
  { id: 'group-indirect-income', ledgerName: 'Indirect Incomes', group: 'Income', nature: 'Income' as const, parentLedgerId: 'group-income' },

  // Level 1 under Expense
  { id: 'group-purchase-accounts', ledgerName: 'Purchase Accounts', group: 'Expense', nature: 'Expense' as const, parentLedgerId: 'group-expense' },
  { id: 'group-indirect-expenses', ledgerName: 'Indirect Expenses', group: 'Expense', nature: 'Expense' as const, parentLedgerId: 'group-expense' },
];


export function AddCompanySheet({
  children,
  open,
  onOpenChange,
  onCompanyCreated,
  firmId,
  editCompany,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated: () => void;
  firmId: string;
  editCompany?: Company | null;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!editCompany;
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (editCompany && open) {
      const fyStart = editCompany.financialYearStart instanceof Date
        ? editCompany.financialYearStart
        : (editCompany.financialYearStart as any)?.toDate?.() || currentFinancialYearStart;
      const booksStartDate = editCompany.booksStart
        ? (editCompany.booksStart instanceof Date ? editCompany.booksStart : (editCompany.booksStart as any)?.toDate?.() || fyStart)
        : fyStart;

      form.reset({
        companyName: editCompany.companyName || '',
        mailingName: editCompany.mailingName || '',
        addressLine1: editCompany.addressLine1 || '',
        addressLine2: editCompany.addressLine2 || '',
        city: editCompany.city || '',
        district: editCompany.district || '',
        state: editCompany.state || '',
        country: editCompany.country || 'India',
        pincode: editCompany.pincode || '',
        telephone: editCompany.telephone || '',
        mobileNumber: editCompany.mobileNumber || '',
        email: editCompany.email || '',
        website: editCompany.website || '',
        financialYearStart: fyStart,
        booksStart: booksStartDate,
        baseCurrencySymbol: editCompany.baseCurrencySymbol || '₹',
        formalCurrencyName: editCompany.formalCurrencyName || 'INR',
        inventory: editCompany.inventory || false,
        multiCurrency: editCompany.multiCurrency || false,
        gstApplicable: editCompany.gstApplicable || !!editCompany.gstin,
        gstin: editCompany.gstin || '',
        gstRegType: editCompany.gstRegType || undefined,
        pan: editCompany.pan || '',
        tan: editCompany.tan || '',
        bankDetails: {
          bankName: editCompany.bankDetails?.bankName || '',
          accountHolderName: editCompany.bankDetails?.accountHolderName || '',
          accountNumber: editCompany.bankDetails?.accountNumber || '',
          ifscCode: editCompany.bankDetails?.ifscCode || '',
          branchName: editCompany.bankDetails?.branchName || '',
        },
      });
    } else if (!editCompany && open) {
      form.reset(defaultValues);
    }
  }, [editCompany, open]);

  const handleGstinBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const gstinValue = e.target.value.toUpperCase();
    form.setValue('gstin', gstinValue); // Ensure value is uppercase
    if (gstinValue && gstRegex.test(gstinValue)) {
      const pan = gstinValue.substring(2, 12);
      form.setValue('pan', pan, { shouldValidate: true });
    } else {
      form.setValue('pan', '', { shouldValidate: true });
    }
  };

  const isGstValid = gstRegex.test(form.watch('gstin') || '');

  async function onSubmit(data: CompanyFormValues) {
    if (!firmId || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Cannot ${isEditing ? 'update' : 'create'} company. Firm is not identified.`,
      });
      return;
    }
    setIsSubmitting(true);

    const companyFields = {
      companyName: data.companyName,
      mailingName: data.mailingName || '',
      gstin: data.gstin || '',
      address: [data.addressLine1, data.city, data.state].filter(Boolean).join(', '),
      addressLine1: data.addressLine1 || '',
      addressLine2: data.addressLine2 || '',
      city: data.city || '',
      district: data.district || '',
      state: data.state || '',
      country: data.country || 'India',
      pincode: data.pincode || '',
      telephone: data.telephone || '',
      mobileNumber: data.mobileNumber || '',
      email: data.email || '',
      website: data.website || '',
      financialYearStart: data.financialYearStart,
      financialYearEnd: new Date(data.financialYearStart.getFullYear() + 1, 2, 31),
      booksStart: data.booksStart,
      baseCurrencySymbol: data.baseCurrencySymbol || '₹',
      formalCurrencyName: data.formalCurrencyName || 'INR',
      inventory: data.inventory || false,
      multiCurrency: data.multiCurrency || false,
      gstApplicable: data.gstApplicable || false,
      gstRegType: data.gstRegType || null,
      pan: data.pan || '',
      tan: data.tan || '',
      bankDetails: data.bankDetails || null,
      firmId: firmId,
    };
    
    try {
      if (isEditing && editCompany) {
        const companyRef = doc(firestore, 'firms', firmId, 'companies', editCompany.id);
        await updateDoc(companyRef, {
          ...companyFields,
          updatedAt: serverTimestamp(),
        });
        onCompanyCreated();
      } else {
        const companiesColRef = collection(firestore, 'firms', firmId, 'companies');
        const newCompanyRef = doc(companiesColRef);

        const batch = writeBatch(firestore);
        batch.set(newCompanyRef, {
          ...companyFields,
          id: newCompanyRef.id,
          companyId: newCompanyRef.id,
          status: 'Active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const ledgersColRef = collection(newCompanyRef, 'ledgers');
        defaultLedgerGroups.forEach(group => {
          const ledgerDocRef = doc(ledgersColRef, group.id);
          batch.set(ledgerDocRef, {
            ...group,
            id: group.id,
            isGroup: true,
            openingBalance: 0,
            currentBalance: 0,
            balanceType: group.nature === 'Asset' || group.nature === 'Expense' ? 'Dr' : 'Cr',
            gstApplicable: false,
            status: 'Active',
            isSystem: true,
            firmId: firmId,
            companyId: newCompanyRef.id,
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
        onCompanyCreated();
        form.reset();
      }
    } catch(e) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} company:`, e);
      toast({
        variant: "destructive",
        title: `Failed to ${isEditing ? 'update' : 'create'} company`,
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-3xl w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Edit Company' : 'Create New Company'}</SheetTitle>
              <SheetDescription>
                {isEditing ? 'Update the company profile details.' : 'Fill in the details for the new company profile.'}
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="general">
                    <Building className="mr-2" /> General
                  </TabsTrigger>
                  <TabsTrigger value="financial">
                    <Banknote className="mr-2" /> Financial
                  </TabsTrigger>
                  <TabsTrigger value="tax">
                    <Percent className="mr-2" /> Tax
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-6 pt-4">
                   <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="mailingName" render={({ field }) => (<FormItem><FormLabel>Mailing Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="addressLine1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="addressLine2" render={({ field }) => (<FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl>
                          <SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>)} />
                    <FormField control={form.control} name="pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>)} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="telephone" render={({ field }) => (<FormItem><FormLabel>Telephone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                   <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </TabsContent>

                <TabsContent value="financial" className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="financialYearStart" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Financial Year Beginning From <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={(value) => { const selectedDate = new Date(value); field.onChange(selectedDate); form.setValue('booksStart', selectedDate); }} value={field.value?.toISOString()}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Financial Year" /></SelectTrigger></FormControl>
                            <SelectContent>{financialYears.map(fy => (<SelectItem key={fy.label} value={fy.value.toISOString()}>{fy.label}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="booksStart" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Books Beginning From <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input value={field.value ? format(field.value, "PPP") : ''} readOnly disabled className="disabled:cursor-not-allowed disabled:opacity-100" /></FormControl>
                          <FormDescription>Automatically set from the financial year.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField control={form.control} name="baseCurrencySymbol" render={({ field }) => (<FormItem><FormLabel>Base Currency Symbol</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>)} />
                     <FormField control={form.control} name="formalCurrencyName" render={({ field }) => (<FormItem><FormLabel>Formal Currency Name</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>)} />
                  </div>
                  <div className="space-y-4">
                     <FormField control={form.control} name="inventory" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Maintain Accounts with Inventory</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="multiCurrency" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Multi-Currency</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                      )} />
                  </div>
                   <Accordion type="multiple" className="w-full mt-6">
                    <AccordionItem value="bank-details">
                      <AccordionTrigger><Landmark className="mr-2"/>Bank Details</AccordionTrigger>
                      <AccordionContent className="p-1">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
                            <FormField control={form.control} name="bankDetails.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.accountHolderName" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.ifscCode" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="bankDetails.branchName" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                         </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                <TabsContent value="tax" className="space-y-6 pt-4">
                   <FormField control={form.control} name="gstApplicable" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5"><FormLabel>Is GST Applicable?</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>)} />

                   <div className={cn("space-y-4", !form.watch("gstApplicable") && "hidden")}>
                        <FormField
                           control={form.control}
                           name="gstin"
                           render={({ field }) => (
                               <FormItem>
                                   <FormLabel>GSTIN <span className="text-destructive">*</span></FormLabel>
                                   <FormControl>
                                       <Input {...field} onBlur={handleGstinBlur} />
                                   </FormControl>
                                   <FormMessage />
                               </FormItem>
                           )}
                        />
                        <FormField control={form.control} name="gstRegType" render={({ field }) => (
                          <FormItem><FormLabel>GST Registration Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="Regular">Regular</SelectItem><SelectItem value="Composition">Composition</SelectItem><SelectItem value="Unregistered">Unregistered</SelectItem></SelectContent>
                            </Select>
                          </FormItem>)} />
                        <FormField control={form.control} name="pan" render={({ field }) => (<FormItem><FormLabel>PAN Number <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isGstValid} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="tan" render={({ field }) => (<FormItem><FormLabel>TAN Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
            <SheetFooter className="pt-4 mt-auto">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving..." : (isEditing ? "Update Company" : "Save Company")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
