"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { handleTallyImport, type TallyImportState, type TallyPreviewLedger } from "@/app/actions";
import type { Company, Ledger } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Upload, Loader2, FileCheck2, AlertCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";

const initialState: TallyImportState = {
  message: "",
  summary: null,
  preview: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        "Start Import"
      )}
    </Button>
  );
}

export function TallyImportDialog({ companies, ledgers }: { companies: Company[], ledgers: Ledger[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [state, formAction] = useActionState(handleTallyImport, initialState);
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies[0]?.id || '');
  const [selectedFirmId, setSelectedFirmId] = React.useState<string>(companies[0]?.firmId || '');

  const { toast } = useToast();

  React.useEffect(() => {
    if (!isOpen) {
        // Reset state when dialog is closed
        setFileContent(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (state.message && !state.error) {
        if (state.summary) {
            toast({
                title: "Import Complete",
                description: state.message,
            });
             // Optionally trigger a refresh of ledger data here
        }
    }
    if (state.error) {
         toast({
            variant: "destructive",
            title: "Import Failed",
            description: state.error,
        });
    }
  }, [state, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  
  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
        setSelectedCompanyId(company.id);
        setSelectedFirmId(company.firmId);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import from Tally
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Ledgers from Tally Prime</DialogTitle>
          <DialogDescription>
            Upload your Tally Prime XML file to import ledger masters.
          </DialogDescription>
        </DialogHeader>
        
        {state.summary ? (
            <ImportSummary summary={state.summary} />
        ) : state.preview ? (
            <ImportPreview preview={state.preview} />
        ) : (
        <form action={formAction}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Upload and Company */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="xml-file">Tally XML File</Label>
                        <Input id="xml-file" name="xml-file" type="file" accept=".xml" required onChange={handleFileChange} ref={fileInputRef}/>
                        <input type="hidden" name="xmlContent" value={fileContent || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="companyId">Select Company</Label>
                         <Select name="companyId" value={selectedCompanyId} onValueChange={handleCompanyChange} required>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <input type="hidden" name="firmId" value={selectedFirmId} />
                    </div>
                </div>

                {/* Column 2: Import Options */}
                <div className="space-y-4 rounded-lg border p-4">
                    <Label>Import Options</Label>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Duplicate Handling</Label>
                        <RadioGroup name="importMode" defaultValue="skip" className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="skip" id="skip" />
                                <Label htmlFor="skip" className="font-normal">Skip</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="update" id="update" />
                                <Label htmlFor="update" className="font-normal">Update</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="flex items-center space-x-2 pt-2">
                        <Switch id="dryRun" name="dryRun" defaultChecked={true} />
                        <Label htmlFor="dryRun">Dry Run (Preview changes without saving)</Label>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
        )}

      </DialogContent>
    </Dialog>
  );
}


function ImportPreview({ preview }: { preview: TallyPreviewLedger[] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
                <ListChecks className="h-6 w-6 text-primary" />
                <span>Import Preview ({preview.length} ledgers)</span>
            </div>
             <ScrollArea className="h-96">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead>Ledger Name</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Opening Balance</TableHead>
                            <TableHead>Dr/Cr</TableHead>
                            <TableHead>GSTIN</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {preview.map((ledger, index) => (
                            <TableRow key={index} className={ledger.status === 'Error' ? 'bg-destructive/10' : ''}>
                                <TableCell>{ledger.ledgerName}</TableCell>
                                <TableCell>{ledger.parent}</TableCell>
                                <TableCell>{ledger.gstClassification || "-"}</TableCell>
                                <TableCell className="text-right">{ledger.openingBalance.toFixed(2)}</TableCell>
                                <TableCell>{ledger.balanceType}</TableCell>
                                <TableCell>{ledger.gstin || "-"}</TableCell>
                                <TableCell>
                                    <Badge 
                                        variant={ledger.status === 'New' ? 'default' : (ledger.status === 'Error' ? 'destructive' : 'secondary')}
                                        className={ledger.status === 'New' ? 'bg-green-100 text-green-800' : ''}
                                    >
                                        {ledger.status}
                                    </Badge>
                                    {ledger.error && <p className="text-xs text-destructive mt-1">{ledger.error}</p>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
             <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
             </DialogFooter>
        </div>
    );
}

function ImportSummary({ summary }: { summary: TallyImportState['summary'] }) {
    if (!summary) return null;
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-4 p-8">
            <FileCheck2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Import Successful</h2>
            <p className="text-muted-foreground">Your ledger data has been processed.</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 text-left">
                <div className="font-semibold">Total Records in File:</div>
                <div>{summary.total}</div>
                <div className="font-semibold text-green-600">Successfully Imported:</div>
                <div className="text-green-600">{summary.imported}</div>
                 <div className="font-semibold text-blue-600">Updated:</div>
                <div className="text-blue-600">{summary.updated}</div>
                <div className="font-semibold text-yellow-600">Skipped (Duplicates):</div>
                <div className="text-yellow-600">{summary.skipped}</div>
                <div className="font-semibold text-red-600">Errors:</div>
                <div className="text-red-600">{summary.errors}</div>
            </div>
             <DialogFooter className="pt-6">
                <DialogClose asChild>
                    <Button>Done</Button>
                </DialogClose>
             </DialogFooter>
        </div>
    );
}
