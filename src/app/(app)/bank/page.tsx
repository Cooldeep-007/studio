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
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
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

export default function BankPage() {
  const { profile } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>();
  const [isAddBankAccountSheetOpen, setIsAddBankAccountSheetOpen] = React.useState(false);
  const [isAddPettyCashSheetOpen, setIsAddPettyCashSheetOpen] = React.useState(false);

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
    return allLedgers.filter(l => (l.group === 'Bank Accounts' || l.group === 'Cash-in-Hand') && !l.isGroup);
  }, [allLedgers]);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !selectedCompanyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'vouchers');
  }, [firestore, profile?.firmId, selectedCompanyId]);

  const { data: vouchers, isLoading: isLoadingVouchers } = useCollection<Voucher>(vouchersQuery);

  const accountBalances = React.useMemo(() => {
    const balances = new Map<string, number>();
    if (!accounts || !vouchers) return balances;

    accounts.forEach(acc => {
      const opening = (acc.openingBalance || 0) * (acc.balanceType === 'Cr' ? -1 : 1);
      balances.set(acc.id, opening);
    });

    vouchers.forEach(voucher => {
      voucher.entries.forEach(entry => {
        if (balances.has(entry.ledgerId)) {
          let currentBalance = balances.get(entry.ledgerId)!;
          if (entry.type === 'Dr') {
            currentBalance += entry.amount;
          } else {
            currentBalance -= entry.amount;
          }
          balances.set(entry.ledgerId, currentBalance);
        }
      });
    });
    return balances;
  }, [accounts, vouchers]);

  const totalBalance = React.useMemo(
    () => Array.from(accountBalances.values()).reduce((acc, balance) => acc + balance, 0),
    [accountBalances]
  );
  
  const isLoading = isLoadingCompanies || isLoadingLedgers || isLoadingVouchers;

  const handleAddBankAccount = async (data: any) => {
    if (!firestore || !profile?.firmId || !selectedCompanyId || !allLedgers) return;

    const bankAccountsGroup = allLedgers.find(l => l.isGroup && l.ledgerName === 'Bank Accounts');
    if (!bankAccountsGroup) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find "Bank Accounts" group.' });
      return;
    }
    
    const newLedgerData = {
      ledgerName: data.accountName,
      parentLedgerId: bankAccountsGroup.id,
      group: 'Bank Accounts',
      isGroup: false,
      isBankAccount: true,
      openingBalance: data.openingBalance || 0,
      balanceType: 'Dr',
      currentBalance: data.openingBalance || 0,
      bankDetails: {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
        accountType: data.accountType,
        upiId: data.upiId,
        swiftCode: data.swiftCode,
      },
      firmId: profile.firmId,
      companyId: selectedCompanyId,
      status: 'Active',
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      nature: 'Asset',
      gstApplicable: false,
    };

    try {
      const ledgersColRef = collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
      await addDoc(ledgersColRef, newLedgerData);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create bank account.' });
    }
  };

  const handleAddPettyCash = async (data: any) => {
    if (!firestore || !profile?.firmId || !selectedCompanyId || !allLedgers) return;

    const cashGroup = allLedgers.find(l => l.isGroup && l.ledgerName === 'Cash-in-Hand');
     if (!cashGroup) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find "Cash-in-Hand" group.' });
      return;
    }

    const newLedgerData = {
      ledgerName: data.cashName,
      parentLedgerId: cashGroup.id,
      group: 'Cash-in-Hand',
      isGroup: false,
      isCashAccount: true,
      responsiblePerson: data.responsiblePerson,
      openingBalance: data.openingBalance || 0,
      balanceType: 'Dr',
      currentBalance: data.openingBalance || 0,
      firmId: profile.firmId,
      companyId: selectedCompanyId,
      status: 'Active',
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      nature: 'Asset',
      gstApplicable: false,
    };

    try {
      const ledgersColRef = collection(firestore, 'firms', profile.firmId, 'companies', selectedCompanyId, 'ledgers');
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
                        {account.group === 'Bank Accounts' ? <Landmark className="h-4 w-4 text-muted-foreground" /> : <Wallet className="h-4 w-4 text-muted-foreground" />}
                        {account.bankDetails?.bankName || account.ledgerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {account.bankDetails?.accountType || (account.ledgerName === 'Cash in Hand' ? 'Cash' : 'N/A')}
                    </TableCell>
                    <TableCell>{account.bankDetails?.ifscCode || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(accountBalances.get(account.id) || 0)}
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
    <AddBankAccountSheet open={isAddBankAccountSheetOpen} onOpenChange={setIsAddBankAccountSheetOpen} onSave={handleAddBankAccount} />
    <AddPettyCashSheet open={isAddPettyCashSheetOpen} onOpenChange={setIsAddPettyCashSheetOpen} onSave={handleAddPettyCash} />
    </>
  );
}
