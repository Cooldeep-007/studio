
"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { handleTallyImport, type TallyImportState, type TallyPreviewLedger } from "@/app/actions";
import type { Company, Ledger } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Upload, Loader2, FileCheck2, ListChecks, Download } from "lucide-react";
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
import { Progress } from "./ui/progress";

const initialState: TallyImportState = {
  message: "",
  summary: null,
  preview: null,
  error: null,
};

// Main component
export function TallyImportDialog({ companies, ledgers }: { companies: Company[], ledgers: Ledger[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formKey, setFormKey] = React.useState(() => Date.now());

  const [state, setState] = React.useState(initialState);
  const { toast } = useToast();

  React.useEffect(() => {
    if (state.message && !state.error && state.summary) {
        toast({
            title: "Import Complete",
            description: state.message,
        });
    }
    if (state.error) {
         toast({
            variant: "destructive",
            title: "Import Failed",
            description: state.error,
        });
    }
  }, [state, toast]);

  React.useEffect(() => {
    if (!isOpen) {
      setFormKey(Date.now());
      setState(initialState);
    }
  }, [isOpen]);

  const formActionWrapper = async (formData: FormData) => {
    const result = await handleTallyImport(state, formData);
    setState(result);
  };

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
        
        <form action={formActionWrapper} key={formKey}>
            <TallyImportFormContent state={state} companies={companies} setIsOpen={setIsOpen} />
        </form>

      </DialogContent>
    </Dialog>
  );
}

// Child component to manage form status and UI states
function TallyImportFormContent({
    state,
    companies,
    setIsOpen
}: {
    state: TallyImportState;
    companies: Company[];
    setIsOpen: (open: boolean) => void;
}) {
    const { pending } = useFormStatus();

    // Form field states
    const [fileContent, setFileContent] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies.find(c => c.status === 'Active')?.id || '');
    const [selectedFirmId, setSelectedFirmId] = React.useState<string>(companies.find(c => c.status === 'Active')?.firmId || '');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setFileContent(e.target?.result as string);
            reader.readAsText(file);
        } else {
            setFileContent(null);
        }
    };
  
    const handleCompanyChange = (companyId: string) => {
        const company = companies.find(c => c.id === companyId);
        if (company) {
            setSelectedCompanyId(company.id);
            setSelectedFirmId(company.firmId);
        }
    }

    if (pending) return <ImportProgress />;
    if (state.summary) return <ImportSummary summary={state.summary} setIsOpen={setIsOpen} />;
    if (state.preview) return <ImportPreview preview={state.preview} setIsOpen={setIsOpen} />;
    
    return (
        <>
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="xml-file">Tally XML File</Label>
                            <Input id="xml-file" name="xml-file" type="file" accept=".xml" required onChange={handleFileChange} ref={fileInputRef}/>
                            <input type="hidden" name="xmlContent" value={fileContent || ''} />
                             <a
                                href="/Tally_Ledger_Masters_Sample.xml"
                                download
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                <Download className="h-3 w-3" />
                                Download Sample File
                            </a>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyId">Select Company</Label>
                            <Select name="companyId" value={selectedCompanyId} onValueChange={handleCompanyChange} required>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {companies.filter(c => c.status === 'Active').map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="firmId" value={selectedFirmId} />
                        </div>
                    </div>
                    <div className="space-y-4 rounded-lg border p-4">
                        <Label>Import Options</Label>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Duplicate Handling</Label>
                            <RadioGroup name="importMode" defaultValue="skip" className="flex space-x-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="skip" id="skip" /><Label htmlFor="skip" className="font-normal">Skip</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="update" id="update" /><Label htmlFor="update" className="font-normal">Update</Label></div>
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
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={!fileContent}>Start Import</Button>
            </DialogFooter>
        </>
    );
}

// Progress view
function ImportProgress() {
  const [progress, setProgress] = React.useState(13);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prevProgress => (prevProgress >= 95 ? 95 : prevProgress + 5));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h2 className="text-xl font-semibold">Import in progress...</h2>
      <p className="text-sm text-muted-foreground text-center">
        Parsing and saving your ledger data. Please do not close this window.
      </p>
      <Progress value={progress} className="w-full" />
    </div>
  );
}

// Summary view (modified to accept setIsOpen)
function ImportSummary({ summary, setIsOpen }: { summary: NonNullable<TallyImportState['summary']>, setIsOpen: (open: boolean) => void }) {
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-4 p-8">
            <FileCheck2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Import Successful</h2>
            <p className="text-muted-foreground">Your ledger data has been processed.</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 text-left">
                <div className="font-semibold">Total Records in File:</div><div>{summary.total}</div>
                <div className="font-semibold text-green-600">Successfully Imported:</div><div className="text-green-600">{summary.imported}</div>
                <div className="font-semibold text-blue-600">Updated:</div><div className="text-blue-600">{summary.updated}</div>
                <div className="font-semibold text-yellow-600">Skipped (Duplicates):</div><div className="text-yellow-600">{summary.skipped}</div>
                <div className="font-semibold text-red-600">Errors:</div><div className="text-red-600">{summary.errors}</div>
            </div>
             <DialogFooter className="pt-6">
                <Button onClick={() => setIsOpen(false)}>Done</Button>
             </DialogFooter>
        </div>
    );
}

// Preview view (modified to accept setIsOpen)
function ImportPreview({ preview, setIsOpen }: { preview: TallyPreviewLedger[], setIsOpen: (open: boolean) => void }) {
    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return '0.00';
        }
        return amount.toFixed(2);
    }
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold"><ListChecks className="h-6 w-6 text-primary" /><span>Import Preview ({preview.length} ledgers)</span></div>
             <ScrollArea className="h-96"><Table>
                <TableHeader className="sticky top-0 bg-background"><TableRow>
                    <TableHead>Ledger Name</TableHead><TableHead>Parent</TableHead><TableHead>Type</TableHead><TableHead>Opening Balance</TableHead><TableHead>Dr/Cr</TableHead><TableHead>GSTIN</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {preview.map((ledger, index) => (
                        <TableRow key={index} className={ledger.status === 'Error' ? 'bg-destructive/10' : ''}>
                            <TableCell>{ledger.ledgerName}</TableCell><TableCell>{ledger.parent}</TableCell><TableCell>{ledger.gstClassification || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(ledger.openingBalance)}</TableCell>
                            <TableCell>{ledger.balanceType}</TableCell><TableCell>{ledger.gstin || "-"}</TableCell>
                            <TableCell>
                                <Badge variant={ledger.status === 'New' ? 'default' : (ledger.status === 'Error' ? 'destructive' : 'secondary')} className={ledger.status === 'New' ? 'bg-green-100 text-green-800' : ''}>{ledger.status}</Badge>
                                {ledger.error && <p className="text-xs text-destructive mt-1">{ledger.error}</p>}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table></ScrollArea>
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
             </DialogFooter>
        </div>
    );
}
