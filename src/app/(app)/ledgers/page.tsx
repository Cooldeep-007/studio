
"use client";

import * as React from "react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';

import { PlusCircle, ListFilter, Upload, Search, Download, FileText, FileSpreadsheet, Loader2, Building } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AddLedgerSheet } from "@/components/add-ledger-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import type { Company, Ledger } from "@/lib/types";
import { TallyImportDialog } from "@/components/tally-import-dialog";
import { useUser } from "@/firebase/auth/use-user";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Link from "next/link";


// Helper type for tree structure
interface LedgerWithChildren extends Ledger {
  children: LedgerWithChildren[];
}

// All possible columns
const allColumns: { id: keyof Ledger | 'parentLedgerName' | string; label: string; isAdvanced: boolean }[] = [
    { id: 'ledgerName', label: 'Ledger Name', isAdvanced: false },
    { id: 'parentLedgerName', label: 'Parent Ledger', isAdvanced: false },
    { id: 'group', label: 'Group', isAdvanced: false },
    { id: 'gstDetails.gstClassification', label: 'Goods/Services', isAdvanced: false },
    { id: 'openingBalance', label: 'Opening Balance', isAdvanced: false },
    { id: 'currentBalance', label: 'Current Balance', isAdvanced: false },
    { id: 'balanceType', label: 'Dr/Cr', isAdvanced: false },
    { id: 'gstApplicable', label: 'GST Applicable', isAdvanced: true },
    { id: 'gstDetails.gstRate', label: 'GST Rate', isAdvanced: true },
    { id: 'status', label: 'Status', isAdvanced: false },
    { id: 'ledgerCode', label: 'Ledger Code', isAdvanced: true },
    { id: 'contactDetails.contactPerson', label: 'Contact Person', isAdvanced: true },
    { id: 'contactDetails.mobileNumber', label: 'Mobile Number', isAdvanced: true },
    { id: 'contactDetails.email', label: 'Email', isAdvanced: true },
    { id: 'contactDetails.addressLine1', label: 'Address', isAdvanced: true },
    { id: 'contactDetails.pan', label: 'PAN', isAdvanced: true },
    { id: 'gstDetails.gstin', label: 'GSTIN', isAdvanced: true },
    { id: 'creditControl.creditLimit', label: 'Credit Limit', isAdvanced: true },
    { id: 'creditControl.creditPeriod', label: 'Payment Terms (Days)', isAdvanced: true },
    { id: 'createdAt', label: 'Created Date', isAdvanced: true },
    { id: 'lastUpdatedAt', label: 'Last Updated', isAdvanced: true },
];

const defaultVisibleColumns = Object.fromEntries(
  allColumns.filter(c => !c.isAdvanced).map(c => [c.id, true])
);

// Function to build ledger tree
function buildLedgerTree(ledgers: Ledger[]): LedgerWithChildren[] {
  const ledgerMap: Record<string, LedgerWithChildren> = {};
  const ledgerTree: LedgerWithChildren[] = [];

  for (const ledger of ledgers) {
    ledgerMap[ledger.id] = { ...ledger, children: [] };
  }

  for (const ledger of Object.values(ledgerMap)) {
    if (ledger.parentLedgerId && ledgerMap[ledger.parentLedgerId]) {
      ledgerMap[ledger.parentLedgerId].children.push(ledger);
    } else {
      ledgerTree.push(ledger);
    }
  }
  return ledgerTree;
}

// Component to render a single row (and its children recursively)
function LedgerRow({ 
  ledger, 
  visibleColumns, 
  level, 
  parentName,
  selectedRows,
  onSelectionChange
}: { 
  ledger: LedgerWithChildren; 
  visibleColumns: Record<string, boolean>; 
  level: number; 
  parentName?: string;
  selectedRows: Record<string, boolean>;
  onSelectionChange: (ledgerId: string, checked: boolean) => void;
}) {
  const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((o, i) => o?.[i], obj);

  const isSelected = !!selectedRows[ledger.id];
  const createdAt = ledger.createdAt instanceof Date ? ledger.createdAt : (ledger.createdAt as any)?.toDate();
  const lastUpdatedAt = ledger.lastUpdatedAt instanceof Date ? ledger.lastUpdatedAt : (ledger.lastUpdatedAt as any)?.toDate();


  return (
    <>
      <TableRow className="hover:bg-muted/50 transition-colors" data-state={isSelected ? "selected" : ""}>
        <TableCell style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }} className="font-medium">
             <div className="flex items-center gap-3">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectionChange(ledger.id, !!checked)}
                    aria-label={`Select ledger ${ledger.ledgerName}`}
                />
                <span>{ledger.ledgerName}</span>
            </div>
        </TableCell>
        {visibleColumns.parentLedgerName && <TableCell>{parentName || '-'}</TableCell>}
        {visibleColumns.group && <TableCell><Badge variant="outline">{ledger.group}</Badge></TableCell>}
        {visibleColumns['gstDetails.gstClassification'] && <TableCell>{getNestedValue(ledger, 'gstDetails.gstClassification') || '-'}</TableCell>}
        {visibleColumns.openingBalance && <TableCell className="text-right">{formatCurrency(ledger.openingBalance)}</TableCell>}
        {visibleColumns.currentBalance && <TableCell className="text-right">{formatCurrency(ledger.currentBalance)}</TableCell>}
        {visibleColumns.balanceType && <TableCell>{ledger.balanceType}</TableCell>}
        {visibleColumns.gstApplicable && <TableCell>{ledger.gstApplicable ? 'Yes' : 'No'}</TableCell>}
        {visibleColumns['gstDetails.gstRate'] && <TableCell>{getNestedValue(ledger, 'gstDetails.gstRate') ? `${getNestedValue(ledger, 'gstDetails.gstRate')}%` : '-'}</TableCell>}
        {visibleColumns.status && <TableCell><Badge variant={ledger.status === 'Active' ? 'default' : 'secondary'} className={ledger.status === 'Active' ? 'bg-green-100 text-green-800' : ''}>{ledger.status}</Badge></TableCell>}
        {visibleColumns.ledgerCode && <TableCell>{ledger.ledgerCode || '-'}</TableCell>}
        {visibleColumns['contactDetails.contactPerson'] && <TableCell>{getNestedValue(ledger, 'contactDetails.contactPerson') || '-'}</TableCell>}
        {visibleColumns['contactDetails.mobileNumber'] && <TableCell>{getNestedValue(ledger, 'contactDetails.mobileNumber') || '-'}</TableCell>}
        {visibleColumns['contactDetails.email'] && <TableCell>{getNestedValue(ledger, 'contactDetails.email') || '-'}</TableCell>}
        {visibleColumns['contactDetails.addressLine1'] && <TableCell>{getNestedValue(ledger, 'contactDetails.addressLine1') || '-'}</TableCell>}
        {visibleColumns['contactDetails.pan'] && <TableCell>{getNestedValue(ledger, 'contactDetails.pan') || '-'}</TableCell>}
        {visibleColumns['gstDetails.gstin'] && <TableCell>{getNestedValue(ledger, 'gstDetails.gstin') || '-'}</TableCell>}
        {visibleColumns['creditControl.creditLimit'] && <TableCell>{getNestedValue(ledger, 'creditControl.creditLimit') ? formatCurrency(getNestedValue(ledger, 'creditControl.creditLimit')) : '-'}</TableCell>}
        {visibleColumns['creditControl.creditPeriod'] && <TableCell>{getNestedValue(ledger, 'creditControl.creditPeriod') || '-'}</TableCell>}
        {visibleColumns.createdAt && <TableCell>{createdAt ? format(createdAt, 'PPP') : '-'}</TableCell>}
        {visibleColumns.lastUpdatedAt && <TableCell>{lastUpdatedAt ? format(lastUpdatedAt, 'PPP') : '-'}</TableCell>}
      </TableRow>
      {ledger.children.map(child => (
        <LedgerRow key={child.id} ledger={child} visibleColumns={visibleColumns} level={level + 1} parentName={ledger.ledgerName} selectedRows={selectedRows} onSelectionChange={onSelectionChange}/>
      ))}
    </>
  );
}

export default function LedgersPage() {
  const { profile } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>();
  const [ledgerTree, setLedgerTree] = React.useState<LedgerWithChildren[]>([]);
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = React.useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = React.useState(false);
  const [isAddLedgerSheetOpen, setIsAddLedgerSheetOpen] = React.useState(false);

  const canManage = profile?.role === 'Owner' || profile?.role === 'Admin';
  
  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId) return null;
    return query(collection(firestore, 'firms', profile.firmId, 'companies'), where('status', '==', 'Active'));
  }, [firestore, profile?.firmId]);

  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);

  React.useEffect(() => {
    if (!selectedCompanyId && companies && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);
  
  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
  }, [firestore, profile?.firmId, selectedCompanyId]);

  const { data: ledgersData, isLoading: isLoadingLedgers } = useCollection<Ledger>(ledgersQuery);
  const ledgers = ledgersData || [];

  const ledgerMap = React.useMemo(() => Object.fromEntries(ledgers.map(l => [l.id, l])), [ledgers]);

  React.useEffect(() => {
    setIsMounted(true);
    const savedPrefs = localStorage.getItem('ledgerColumnPrefs');
    if (savedPrefs) {
      setVisibleColumns(JSON.parse(savedPrefs));
    } else {
      setVisibleColumns(defaultVisibleColumns);
    }
  }, []);

  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem('ledgerColumnPrefs', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isMounted]);

  const flattenTree = React.useCallback((nodes: LedgerWithChildren[]): Ledger[] => {
      let flatList: Ledger[] = [];
      nodes.forEach(node => {
          const { children, ...rest } = node;
          flatList.push(rest as Ledger);
          if (children.length > 0) {
              flatList = flatList.concat(flattenTree(children));
          }
      });
      return flatList;
  }, []);
  
  React.useEffect(() => {
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
    };

    const lowercasedSearch = search.toLowerCase();
    const activeColumnFilters = Object.entries(columnFilters).filter(([, value]) => value);

    if (!lowercasedSearch && activeColumnFilters.length === 0) {
        const tree = buildLedgerTree(ledgers);
        setLedgerTree(tree);
        return;
    }

    const filtered = ledgers.filter(ledger => {
        const matchesGlobalSearch = lowercasedSearch ? ledger.ledgerName.toLowerCase().includes(lowercasedSearch) : true;
        if (!matchesGlobalSearch) return false;

        const matchesColumnFilters = activeColumnFilters.every(([colId, filterValue]) => {
            const lowercasedFilter = filterValue.toLowerCase();
            let value: any;

            if (colId === 'parentLedgerName') {
                value = ledger.parentLedgerId ? ledgerMap[ledger.parentLedgerId]?.ledgerName : '-';
            } else {
                value = getNestedValue(ledger, colId);
            }
            
            if (value === undefined || value === null) return false;

            if (colId === 'createdAt' || colId === 'lastUpdatedAt') {
              const dateVal = value instanceof Date ? value : (value as any)?.toDate();
              if (dateVal) value = format(dateVal, 'PPP');
            }

            return String(value).toLowerCase().includes(lowercasedFilter);
        });

        return matchesColumnFilters;
    });

    const ledgerIdsToShow = new Set<string>();
    filtered.forEach(ledger => {
        ledgerIdsToShow.add(ledger.id);
        let current = ledger;
        while (current.parentLedgerId) {
            const parent = ledgerMap[current.parentLedgerId];
            if (!parent) break;
            ledgerIdsToShow.add(parent.id);
            current = parent;
        }
    });

    const ledgersForTree = ledgers.filter(l => ledgerIdsToShow.has(l.id));
    const tree = buildLedgerTree(ledgersForTree);
    setLedgerTree(tree);

  }, [ledgers, search, columnFilters, ledgerMap]);
  
  const handleColumnVisibilityChange = (columnId: string, checked: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: checked }));
  };

  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  };

  const handleSelectionChange = (ledgerId: string, checked: boolean) => {
    setSelectedRows(prev => ({...prev, [ledgerId]: checked }));
  };

  const visibleLedgerIds = React.useMemo(() => flattenTree(ledgerTree).map(l => l.id), [ledgerTree, flattenTree]);
  const isAllVisibleSelected = React.useMemo(() => visibleLedgerIds.length > 0 && visibleLedgerIds.every(id => selectedRows[id]), [visibleLedgerIds, selectedRows]);

  const handleSelectAll = (checked: boolean) => {
      const newSelectedRows = {...selectedRows};
      visibleLedgerIds.forEach(id => {
          newSelectedRows[id] = checked;
      });
      setSelectedRows(newSelectedRows);
  };

  const handleExport = async (formatType: 'pdf' | 'xlsx') => {
      if (!selectedCompanyId) return;
      setIsExporting(true);
      toast({ title: 'Exporting...', description: `Your ledger data is being prepared as a ${formatType.toUpperCase()} file.` });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
      let dataToExport: Ledger[];

      if (selectedIds.length > 0) {
          dataToExport = ledgers.filter(l => selectedIds.includes(l.id));
      } else {
          dataToExport = flattenTree(ledgerTree);
      }
      
      const exportData = dataToExport.map(ledger => ({
          'Ledger Name': ledger.ledgerName,
          'Parent Ledger': ledgerMap[ledger.parentLedgerId || '']?.ledgerName || '-',
          'Group': ledger.group,
          'Opening Balance': ledger.openingBalance,
          'Dr/Cr': ledger.balanceType,
          'GST Applicable': ledger.gstApplicable ? 'Yes' : 'No',
          'GSTIN': ledger.gstDetails?.gstin || '-',
          'GST Rate': ledger.gstDetails?.gstRate ? `${ledger.gstDetails.gstRate}%` : '-',
          'HSN/SAC': ledger.gstDetails?.hsnCode || '-',
          'Contact Person': ledger.contactDetails?.contactPerson || '-',
          'Mobile': ledger.contactDetails?.mobileNumber || '-',
          'Email': ledger.contactDetails?.email || '-',
          'Created Date': ledger.createdAt ? format(ledger.createdAt instanceof Date ? ledger.createdAt : (ledger.createdAt as any).toDate(), 'yyyy-MM-dd') : '-',
      }));

      const today = format(new Date(), 'yyyy_MM_dd');
      const companyName = companies?.find(c => c.id === selectedCompanyId)?.companyName || "Pro Accounting";

      if (formatType === 'xlsx') {
          exportToExcel(exportData, companyName, today);
      } else {
          exportToPdf(exportData, companyName, today);
      }

      setIsExporting(false);
      toast({ title: 'Export Successful', description: 'Your file has been downloaded.' });
  };


  if (!isMounted || isLoadingCompanies) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!companies || companies.length === 0) {
     return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        </div>
        <Card className="text-center">
          <CardHeader>
              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                <Building className="h-8 w-8 text-primary" />
              </div>
            <CardTitle className="mt-4">No Active Company Found</CardTitle>
            <CardDescription>
              To manage your chart of accounts, you first need to create a company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/companies">
                <PlusCircle className="mr-2 h-4 w-4" /> Go to Companies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleCols = allColumns.filter(col => visibleColumns[col.id]);
  const isLoading = isLoadingCompanies || isLoadingLedgers;

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        <div className="flex w-full sm:w-auto items-center gap-2">
            {companies && companies.length > 1 && (
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Company" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
            )}
            <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search ledgers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-full sm:w-48"
                />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <ListFilter className="mr-2 h-4 w-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Basic Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allColumns.filter(c => !c.isAdvanced).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={!!visibleColumns[column.id]}
                    onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, !!checked)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuLabel>Advanced Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {allColumns.filter(c => c.isAdvanced).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={!!visibleColumns[column.id]}
                    onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, !!checked)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <TallyImportDialog companies={companies} />
             {canManage && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExport('pdf')}>
                            <FileText className="mr-2 h-4 w-4" />
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export as Excel
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <Button onClick={() => setIsAddLedgerSheetOpen(true)} disabled={!selectedCompanyId}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledgers</CardTitle>
          <CardDescription>Your complete list of accounts, organized by parent-child relationships.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="w-[30%]">
                      <div className="flex items-center gap-3">
                         <Checkbox
                            checked={isAllVisibleSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            aria-label="Select all visible rows"
                         />
                         {visibleColumns.ledgerName && allColumns.find(c => c.id === 'ledgerName')?.label}
                      </div>
                    </TableHead>
                  {visibleCols.slice(1).map(column => 
                      <TableHead key={column.id} className={['openingBalance', 'currentBalance', 'creditControl.creditLimit'].includes(column.id) ? 'text-right' : ''}>
                          {column.label}
                      </TableHead>
                  )}
                </TableRow>
                <TableRow>
                   {visibleCols.map(column => (
                      <TableCell key={`${column.id}-filter`} className="p-1 align-top">
                          <Input
                              placeholder={`Filter...`}
                              value={columnFilters[column.id] || ''}
                              onChange={(e) => handleColumnFilterChange(column.id, e.target.value)}
                              className="h-8 text-xs"
                          />
                      </TableCell>
                   ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : ledgerTree.length > 0 ? (
                  ledgerTree.map((ledger) => (
                    <LedgerRow key={ledger.id} ledger={ledger} visibleColumns={visibleColumns} level={0} parentName={ledger.parentLedgerId ? ledgerMap[ledger.parentLedgerId]?.ledgerName : '-'} selectedRows={selectedRows} onSelectionChange={handleSelectionChange}/>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    {profile && selectedCompanyId && (
        <AddLedgerSheet 
            open={isAddLedgerSheetOpen}
            onOpenChange={setIsAddLedgerSheetOpen}
            ledgers={ledgers} 
            firmId={profile.firmId}
            companyId={selectedCompanyId}
        />
    )}
    </>
  );
}


// --- EXPORT HELPERS ---

const exportToPdf = (data: Record<string, any>[], companyName: string, dateStr: string) => {
    if (data.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableData = data.map(row => Object.values(row));
    const tableHeaders = Object.keys(data[0]);
    const exportDate = format(new Date(), 'PPP');

    (doc as jsPDFType & { autoTable: (options: any) => void }).autoTable({
        head: [tableHeaders],
        body: tableData,
        didDrawPage: (data: any) => {
            doc.setFontSize(18);
            doc.setTextColor(40);
            doc.text(companyName, data.settings.margin.left, 15);
            doc.setFontSize(10);
            doc.text(`Ledger Masters Export - ${exportDate}`, data.settings.margin.left, 22);

            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
        margin: { top: 30 },
    });

    doc.save(`ProAccounting_Masters_${dateStr}.pdf`);
};

const exportToExcel = (data: Record<string, any>[], companyName: string, dateStr: string) => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet([]);
    
    XLSX.utils.sheet_add_aoa(ws, [[`Company: ${companyName}`]], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(ws, [[`Export Date: ${format(new Date(), 'PPP')}`]], { origin: 'A2' });

    XLSX.utils.sheet_add_json(ws, data, { origin: 'A4', skipHeader: false });
    
    const footerOrigin = data.length + 6;
    XLSX.utils.sheet_add_aoa(ws, [[`Total Ledgers: ${data.length}`]], { origin: `A${footerOrigin}` });
    
    const headerCellStyle = { font: { bold: true } };
    const headers = Object.keys(data[0]);
    headers.forEach((header, index) => {
        const cellAddress = XLSX.utils.encode_cell({c: index, r: 3});
        if(ws[cellAddress]) {
            ws[cellAddress].s = headerCellStyle;
        }
    });

    const colWidths = headers.map(key => ({
        wch: Math.max(key.length, ...data.map(row => (row[key] || '').toString().length)) + 2
    }));
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledgers');
    XLSX.writeFile(wb, `ProAccounting_Masters_${dateStr}.xlsx`);
};
