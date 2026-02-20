"use client";

import * as React from "react";
import { PlusCircle, ListFilter, Upload } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLedgerSheet } from "@/components/add-ledger-sheet";
import { mockLedgers, mockCompanies } from "@/lib/data";
import type { Company, Ledger } from "@/lib/types";
import { TallyImportDialog } from "@/components/tally-import-dialog";

// Helper type for tree structure
interface LedgerWithChildren extends Ledger {
  children: LedgerWithChildren[];
}

// All possible columns
const allColumns: { id: keyof Ledger | 'parentLedgerName' | string; label: string; isAdvanced: boolean }[] = [
    { id: 'ledgerName', label: 'Ledger Name', isAdvanced: false },
    { id: 'parentLedgerName', label: 'Parent Ledger', isAdvanced: false },
    { id: 'group', label: 'Group', isAdvanced: false },
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

  // Initialize map and add children array
  for (const ledger of ledgers) {
    ledgerMap[ledger.id] = { ...ledger, children: [] };
  }

  // Build the tree
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
function LedgerRow({ ledger, visibleColumns, level, parentName }: { ledger: LedgerWithChildren; visibleColumns: Record<string, boolean>; level: number, parentName?: string }) {
  const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <>
      <TableRow className="hover:bg-muted/50 transition-colors">
        {visibleColumns.ledgerName && <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }} className="font-medium">{ledger.ledgerName}</TableCell>}
        {visibleColumns.parentLedgerName && <TableCell>{parentName || '-'}</TableCell>}
        {visibleColumns.group && <TableCell><Badge variant="outline">{ledger.group}</Badge></TableCell>}
        {visibleColumns.openingBalance && <TableCell className="text-right">{formatCurrency(ledger.openingBalance)}</TableCell>}
        {visibleColumns.currentBalance && <TableCell className="text-right">{formatCurrency(ledger.currentBalance)}</TableCell>}
        {visibleColumns.balanceType && <TableCell>{ledger.balanceType}</TableCell>}
        {visibleColumns.gstApplicable && <TableCell>{ledger.gstApplicable ? 'Yes' : 'No'}</TableCell>}
        {visibleColumns['gstDetails.gstRate'] && <TableCell>{ledger.gstDetails?.gstRate ? `${ledger.gstDetails.gstRate}%` : '-'}</TableCell>}
        {visibleColumns.status && <TableCell><Badge variant={ledger.status === 'Active' ? 'default' : 'secondary'} className={ledger.status === 'Active' ? 'bg-green-100 text-green-800' : ''}>{ledger.status}</Badge></TableCell>}
        {visibleColumns.ledgerCode && <TableCell>{ledger.ledgerCode || '-'}</TableCell>}
        {visibleColumns['contactDetails.contactPerson'] && <TableCell>{ledger.contactDetails?.contactPerson || '-'}</TableCell>}
        {visibleColumns['contactDetails.mobileNumber'] && <TableCell>{ledger.contactDetails?.mobileNumber || '-'}</TableCell>}
        {visibleColumns['contactDetails.email'] && <TableCell>{ledger.contactDetails?.email || '-'}</TableCell>}
        {visibleColumns['contactDetails.addressLine1'] && <TableCell>{ledger.contactDetails?.addressLine1 || '-'}</TableCell>}
        {visibleColumns['contactDetails.pan'] && <TableCell>{ledger.contactDetails?.pan || '-'}</TableCell>}
        {visibleColumns['gstDetails.gstin'] && <TableCell>{ledger.gstDetails?.gstin || '-'}</TableCell>}
        {visibleColumns['creditControl.creditLimit'] && <TableCell>{ledger.creditControl?.creditLimit ? formatCurrency(ledger.creditControl.creditLimit) : '-'}</TableCell>}
        {visibleColumns['creditControl.creditPeriod'] && <TableCell>{ledger.creditControl?.creditPeriod || '-'}</TableCell>}
        {visibleColumns.createdAt && <TableCell>{new Date(ledger.createdAt).toLocaleDateString()}</TableCell>}
        {visibleColumns.lastUpdatedAt && <TableCell>{new Date(ledger.lastUpdatedAt).toLocaleDateString()}</TableCell>}
      </TableRow>
      {ledger.children.map(child => (
        <LedgerRow key={child.id} ledger={child} visibleColumns={visibleColumns} level={level + 1} parentName={ledger.ledgerName} />
      ))}
    </>
  );
}

export default function LedgersPage() {
  const [ledgers, setLedgers] = React.useState<Ledger[]>(mockLedgers);
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies);
  const [ledgerTree, setLedgerTree] = React.useState<LedgerWithChildren[]>([]);
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = React.useState(false);
  
  const ledgerMap = React.useMemo(() => Object.fromEntries(ledgers.map(l => [l.id, l])), [ledgers]);

  const handleLedgerCreated = (newLedger: Ledger) => {
    setLedgers((prev) => [...prev, newLedger]);
  };

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

  React.useEffect(() => {
    const tree = buildLedgerTree(ledgers);
    setLedgerTree(tree);
  }, [ledgers]);
  
  const handleColumnVisibilityChange = (columnId: string, checked: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: checked }));
  };

  if (!isMounted) {
    // To avoid hydration mismatch with localStorage
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Show / Hide Columns
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
            <TallyImportDialog companies={companies} ledgers={ledgers} />
            <AddLedgerSheet ledgers={ledgers} onLedgerCreated={handleLedgerCreated}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Ledger
              </Button>
            </AddLedgerSheet>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledgers</CardTitle>
          <CardDescription>Your complete list of accounts, organized by parent-child relationships.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {allColumns.filter(col => visibleColumns[col.id]).map(column => 
                    <TableHead key={column.id} className={['openingBalance', 'currentBalance', 'creditControl.creditLimit'].includes(column.id) ? 'text-right' : ''}>
                        {column.label}
                    </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerTree.map((ledger) => (
                <LedgerRow key={ledger.id} ledger={ledger} visibleColumns={visibleColumns} level={0} parentName={ledger.parentLedgerId ? ledgerMap[ledger.parentLedgerId]?.ledgerName : '-'}/>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
