
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Landmark, PlusCircle, Wallet, Loader2, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import type { Ledger, Voucher, Company } from '@/lib/types';
import { AddBankAccountSheet } from '@/components/add-bank-account-sheet';
import { AddPettyCashSheet } from '@/components/add-petty-cash-sheet';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const natureMap: Record<string, string> = {
  'Assets': 'Asset',
  'Liabilities': 'Liability',
  'Income': 'Income',
  'Expense': 'Expense',
};

export default function BankPage() {
  const { profile } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>();
  const [isAddBankAccountSheetOpen, setIsAddBankAccountSheetOpen] = React.useState(false);
  const [isAddPettyCashSheetOpen, setIsAddPettyCashSheetOpen] = React.useState(false);
  const [parentGroups, setParentGroups] = React.useState<{ id: number; group_name: string; primary_nature: string }[]>([]);

  React.useEffect(() => {
    fetch('/api/parent-groups')
      .then(res => res.json())
      .then(data => {
        const groups = Array.isArray(data) ? data : data?.groups;
        if (Array.isArray(groups)) setParentGroups(groups);
      })
      .catch(() => {});
  }, []);

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
  
  const allLedgersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
  }, [firestore, profile?.firmId, selectedCompanyId]);

  const { data: allLedgers, isLoading: isLoadingLedgers } = useCollection<Ledger>(allLedgersQuery);

  const accounts = React.useMemo(() => {
    if (!allLedgers) return [];
    return allLedgers.filter(l =>
      !l.isGroup && (
        l.isBankAccount ||
        l.isCashAccount ||
        l.group === 'Bank Accounts' ||
        l.group === 'Cash-in-Hand'
      )
    );
  }, [allLedgers]);

  const totalBalance = React.useMemo(
    () => accounts.reduce((acc, account) => acc + (account.currentBalance || 0), 0),
    [accounts]
  );
  
  const isLoading = isLoadingCompanies || isLoadingLedgers;

  const resolveParentGroup = async (ledgersColRef: any, groupName: string) => {
    const groupQuery = query(ledgersColRef, where('isGroup', '==', true), where('ledgerName', '==', groupName));
    const groupSnapshot = await getDocs(groupQuery);
    if (!groupSnapshot.empty) return groupSnapshot.docs[0].id;

    const altQuery = query(ledgersColRef, where('isGroup', '==', true), where('group', '==', groupName));
    const altSnapshot = await getDocs(altQuery);
    if (!altSnapshot.empty) return altSnapshot.docs[0].id;

    const pg = parentGroups.find(g => g.group_name === groupName);
    if (pg) {
      const nature = natureMap[pg.primary_nature] || 'Asset';
      const newGroupDoc = await addDoc(ledgersColRef, {
        ledgerName: groupName,
        group: groupName,
        isGroup: true,
        nature,
        openingBalance: 0,
        currentBalance: 0,
        status: 'Active',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
      });
      return newGroupDoc.id;
    }

    return null;
  };

  const handleAddBankAccount = async (data: any) => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return;

    try {
      const ledgersColRef = collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
      const selectedGroup = data.parentGroup || 'Bank Accounts';
      const parentId = await resolveParentGroup(ledgersColRef, selectedGroup);

      if (!parentId) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not find "${selectedGroup}" group.` });
        return;
      }

      const pg = parentGroups.find(g => g.group_name === selectedGroup);
      const nature = pg ? (natureMap[pg.primary_nature] || 'Asset') : 'Asset';

      const bankDetails: Record<string, string> = {};
      if (data.bankName) bankDetails.bankName = data.bankName;
      if (data.accountNumber) bankDetails.accountNumber = data.accountNumber;
      if (data.ifscCode) bankDetails.ifscCode = data.ifscCode;
      if (data.branchName) bankDetails.branchName = data.branchName;
      if (data.accountType) bankDetails.accountType = data.accountType;
      if (data.upiId) bankDetails.upiId = data.upiId;
      if (data.swiftCode) bankDetails.swiftCode = data.swiftCode;

      const newLedgerData: Record<string, any> = {
        ledgerName: data.accountName,
        parentLedgerId: parentId,
        group: selectedGroup,
        isGroup: false,
        isBankAccount: true,
        openingBalance: data.openingBalance || 0,
        balanceType: data.balanceType || 'Dr',
        currentBalance: data.openingBalance || 0,
        bankDetails,
        firmId: profile.firmId,
        companyId: selectedCompanyId,
        status: 'Active',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        nature,
        gstApplicable: false,
      };

      await addDoc(ledgersColRef, newLedgerData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create bank account.' });
    }
  };

  const handleAddPettyCash = async (data: any) => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return;
    
    try {
      const ledgersColRef = collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
      const selectedGroup = data.parentGroup || 'Cash-in-Hand';
      const parentId = await resolveParentGroup(ledgersColRef, selectedGroup);

      if (!parentId) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not find "${selectedGroup}" group.` });
        return;
      }

      const pg = parentGroups.find(g => g.group_name === selectedGroup);
      const nature = pg ? (natureMap[pg.primary_nature] || 'Asset') : 'Asset';

      const newLedgerData: Record<string, any> = {
        ledgerName: data.cashName,
        parentLedgerId: parentId,
        group: selectedGroup,
        isGroup: false,
        isCashAccount: true,
        openingBalance: data.openingBalance || 0,
        balanceType: data.balanceType || 'Dr',
        currentBalance: data.openingBalance || 0,
        firmId: profile.firmId,
        companyId: selectedCompanyId,
        status: 'Active',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        nature,
        gstApplicable: false,
      };
      if (data.responsiblePerson) newLedgerData.responsiblePerson = data.responsiblePerson;
      if (data.remarks) newLedgerData.remarks = data.remarks;

      await addDoc(ledgersColRef, newLedgerData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create petty cash account.' });
    }
  };

  if (!isLoadingCompanies && (!companies || companies.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cash & Bank</h1>
        </div>
        <Card className="text-center">
          <CardHeader>
              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                <Building className="h-8 w-8 text-primary" />
              </div>
            <CardTitle className="mt-4">No Active Company Found</CardTitle>
            <CardDescription>
              To manage cash and bank accounts, you first need to create a company.
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

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Cash & Bank</h1>
        <div className="flex items-center gap-4">
            {companies && companies.length > 1 && (
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Company" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Account
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsAddBankAccountSheetOpen(true)}>
                        <Landmark className="mr-2 h-4 w-4" />
                        Add Bank Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsAddPettyCashSheetOpen(true)}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Add Petty Cash
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Total Cash & Bank Balance</CardTitle>
            <CardDescription>
              Combined balance across all your cash and bank accounts.
            </CardDescription>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalBalance)}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            A list of all your cash and bank accounts. Click on an account to view
            its transaction statement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/bank/${account.id}?companyId=${selectedCompanyId}`}
                        className="hover:underline text-primary flex items-center gap-2"
                      >
                        {account.isBankAccount ? <Landmark className="h-4 w-4 text-muted-foreground" /> : <Wallet className="h-4 w-4 text-muted-foreground" />}
                        {account.bankDetails?.bankName || account.ledgerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountType || (account.isCashAccount ? 'Cash' : 'N/A')}
                    </TableCell>
                    <TableCell>{account.bankDetails?.ifscCode || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.currentBalance || 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No cash or bank accounts found. Click 'Add New Account' to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AddBankAccountSheet open={isAddBankAccountSheetOpen} onOpenChange={setIsAddBankAccountSheetOpen} onSave={handleAddBankAccount} parentGroups={parentGroups} />
    <AddPettyCashSheet open={isAddPettyCashSheetOpen} onOpenChange={setIsAddPettyCashSheetOpen} onSave={handleAddPettyCash} parentGroups={parentGroups} />
    </>
  );
}
