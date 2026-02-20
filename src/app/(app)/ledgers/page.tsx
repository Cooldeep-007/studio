"use client";

import * as React from "react";
import { PlusCircle, ListFilter } from "lucide-react";
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
import { mockLedgers } from "@/lib/data";
import type { Ledger } from "@/lib/types";

// Helper type for tree structure
interface LedgerWithChildren extends Ledger {
  children: LedgerWithChildren[];
}

// All possible columns
const allColumns: { id: keyof Ledger | 'parentLedgerName'; label: string; isAdvanced: boolean }[] = [
    { id: 'ledgerName', label: 'Ledger Name', isAdvanced: false },
    { id: 'parentLedgerName', label: 'Parent Ledger', isAdvanced: false },
    { id: 'group', label: 'Group', isAdvanced: false },
    { id: 'openingBalance', label: 'Opening Balance', isAdvanced: false },
    { id: 'currentBalance', label: 'Current Balance', isAdvanced: false },
    { id: 'balanceType', label: 'Dr/Cr', isAdvanced: false },
    { id: 'gstApplicable', label: 'GST Applicable', isAdvanced: true },
    { id: 'gstRate', label: 'GST Rate', isAdvanced: true },
    { id: 'status', label: 'Status', isAdvanced: false },
    { id: 'ledgerCode', label: 'Ledger Code', isAdvanced: true },
    { id: 'contactPerson', label: 'Contact Person', isAdvanced: true },
    { id: 'mobileNumber', label: 'Mobile Number', isAdvanced: true },
    { id: 'email', label: 'Email', isAdvanced: true },
    { id: 'address', label: 'Address', isAdvanced: true },
    { id: 'pan', label: 'PAN', isAdvanced: true },
    { id: 'gstin', label: 'GSTIN', isAdvanced: true },
    { id: 'creditLimit', label: 'Credit Limit', isAdvanced: true },
    { id: 'paymentTerms', label: 'Payment Terms', isAdvanced: true },
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
      <TableRow>
        {visibleColumns.ledgerName && <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }} className="font-medium">{ledger.ledgerName}</TableCell>}
        {visibleColumns.parentLedgerName && <TableCell>{parentName || '-'}</TableCell>}
        {visibleColumns.group && <TableCell><Badge variant="outline">{ledger.group}</Badge></TableCell>}
        {visibleColumns.openingBalance && <TableCell className="text-right">{formatCurrency(ledger.openingBalance)}</TableCell>}
        {visibleColumns.currentBalance && <TableCell className="text-right">{formatCurrency(ledger.currentBalance)}</TableCell>}
        {visibleColumns.balanceType && <TableCell>{ledger.balanceType}</TableCell>}
        {visibleColumns.gstApplicable && <TableCell>{ledger.gstApplicable ? 'Yes' : 'No'}</TableCell>}
        {visibleColumns.gstRate && <TableCell>{ledger.gstRate ? `${ledger.gstRate}%` : '-'}</TableCell>}
        {visibleColumns.status && <TableCell><Badge variant={ledger.status === 'Active' ? 'default' : 'secondary'} className={ledger.status === 'Active' ? 'bg-green-100 text-green-800' : ''}>{ledger.status}</Badge></TableCell>}
        {visibleColumns.ledgerCode && <TableCell>{ledger.ledgerCode || '-'}</TableCell>}
        {visibleColumns.contactPerson && <TableCell>{ledger.contactPerson || '-'}</TableCell>}
        {visibleColumns.mobileNumber && <TableCell>{ledger.mobileNumber || '-'}</TableCell>}
        {visibleColumns.email && <TableCell>{ledger.email || '-'}</TableCell>}
        {visibleColumns.address && <TableCell>{ledger.address || '-'}</TableCell>}
        {visibleColumns.pan && <TableCell>{ledger.pan || '-'}</TableCell>}
        {visibleColumns.gstin && <TableCell>{ledger.gstin || '-'}</TableCell>}
        {visibleColumns.creditLimit && <TableCell>{ledger.creditLimit ? formatCurrency(ledger.creditLimit) : '-'}</TableCell>}
        {visibleColumns.paymentTerms && <TableCell>{ledger.paymentTerms || '-'}</TableCell>}
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
  const [ledgerTree, setLedgerTree] = React.useState<LedgerWithChildren[]>([]);
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = React.useState(false);
  const ledgerMap = React.useMemo(() => Object.fromEntries(mockLedgers.map(l => [l.id, l])), []);


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
    const tree = buildLedgerTree(mockLedgers);
    setLedgerTree(tree);
  }, []);
  
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
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Ledger
            </Button>
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
                    <TableHead key={column.id} className={['openingBalance', 'currentBalance', 'creditLimit'].includes(column.id) ? 'text-right' : ''}>
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
