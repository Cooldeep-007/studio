"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import type { Company } from "@/lib/types";

import {
  CalendarIcon,
  Loader2,
  Building,
  Banknote,
  Percent,
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const companyFormSchema = z.object({
  // Basic Details
  companyName: z.string().min(2, "Company name is required."),
  mailingName: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().length(6, "Pincode must be 6 digits.").optional().or(z.literal('')),
  mobileNumber: z.string().length(10, "Mobile number must be 10 digits.").optional().or(z.literal('')),
  email: z.string().email("Invalid email format.").optional().or(z.literal('')),
  
  // Financial Details
  financialYearStart: z.date({ required_error: "Financial year start date is required."}),
  booksStart: z.date({ required_error: "Books beginning date is required."}),
  
  // Tax Details
  gstApplicable: z.boolean().default(false),
  gstin: z.string().optional(),
  gstRegType: z.enum(['Regular', 'Composition', 'Unregistered']).optional(),
  pan: z.string().optional(),

}).superRefine((data, ctx) => {
    if (data.gstApplicable) {
        if (!data.gstin || !gstRegex.test(data.gstin)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid 15-character GSTIN is required.", path: ["gstin"] });
        }
        if(!data.pan || !panRegex.test(data.pan)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid PAN is required.", path: ["pan"] });
        }
    }
    if (data.booksStart < data.financialYearStart) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Books cannot begin before the financial year.", path: ["booksStart"] });
    }
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

const defaultValues: Partial<CompanyFormValues> = {
  companyName: "",
  gstApplicable: false,
  financialYearStart: new Date(new Date().getFullYear(), 3, 1),
  booksStart: new Date(new Date().getFullYear(), 3, 1),
};

export function AddCompanySheet({
  children,
  open,
  onOpenChange,
  onCompanyCreated,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated: (company: Company) => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
  });

  async function onSubmit(data: CompanyFormValues) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const newCompany: Company = {
      id: `comp-${new Date().getTime()}`,
      companyName: data.companyName,
      gstin: data.gstin,
      address: `${data.addressLine1 || ''}, ${data.city || ''}, ${data.state || ''}`,
      financialYearStart: data.financialYearStart,
      financialYearEnd: new Date(data.financialYearStart.getFullYear() + 1, 2, 31),
      firmId: 'firm-abc', // Mock data
    };

    onCompanyCreated(newCompany);
    setIsSubmitting(false);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-3xl w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Create New Company</SheetTitle>
              <SheetDescription>
                Fill in the details for the new company profile.
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
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
                  <FormField control={form.control} name="addressLine1" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger></FormControl>
                          <SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>)} />
                    <FormField control={form.control} name="pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                   <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </TabsContent>

                <TabsContent value="financial" className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="financialYearStart" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Financial Year Beginning From <span className="text-destructive">*</span></FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>)}/>
                    <FormField control={form.control} name="booksStart" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Books Beginning From <span className="text-destructive">*</span></FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>)}/>
                  </div>
                </TabsContent>

                <TabsContent value="tax" className="space-y-6 pt-4">
                   <FormField control={form.control} name="gstApplicable" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5"><FormLabel>Is GST Applicable?</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>)} />

                   <div className={cn("space-y-4", !form.watch("gstApplicable") && "hidden")}>
                        <FormField control={form.control} name="gstin" render={({ field }) => (<FormItem><FormLabel>GSTIN <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="gstRegType" render={({ field }) => (
                          <FormItem><FormLabel>GST Registration Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="Regular">Regular</SelectItem><SelectItem value="Composition">Composition</SelectItem><SelectItem value="Unregistered">Unregistered</SelectItem></SelectContent>
                            </Select>
                          </FormItem>)} />
                        <FormField control={form.control} name="pan" render={({ field }) => (<FormItem><FormLabel>PAN Number <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                {isSubmitting ? "Saving..." : "Save Company"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
