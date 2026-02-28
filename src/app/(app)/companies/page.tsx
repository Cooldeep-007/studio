
'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import {
  collection,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Company } from '@/lib/types';
import { AddCompanySheet } from '@/components/add-company-sheet';
import { DeleteCompanyDialog } from '@/components/delete-company-dialog';
import { ArchiveCompanyDialog } from '@/components/archive-company-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function CompaniesPage() {
  const { profile } = useUser();
  const { firestore } = useFirebase();
  const canManage = profile?.role === 'Owner' || profile?.role === 'Admin';

  const [activeTab, setActiveTab] = React.useState('active');
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(
    null
  );
  const { toast } = useToast();

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies');
  }, [firestore, profile?.firmId]);

  const { data: companies, isLoading: isLoadingCompanies } =
    useCollection<Company>(companiesQuery);

  const activeCompanies =
    companies?.filter((c) => c.status === 'Active') || [];
  const archivedCompanies =
    companies?.filter((c) => c.status === 'Archived') || [];

  const onCompanyCreated = () => {
    setIsAddSheetOpen(false);
    toast({
      title: 'Company Created Successfully',
      description: `The new company has been added to your list.`,
    });
    setActiveTab('active');
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCompany || !firestore || !profile?.firmId) return;

    try {
      const vouchersRef = collection(
        firestore,
        'firms',
        profile.firmId,
        'companies',
        selectedCompany.id,
        'vouchers'
      );
      const vouchersSnapshot = await getDocs(query(vouchersRef));

      if (!vouchersSnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Deletion Failed',
          description: `Company "${selectedCompany.companyName}" has existing financial records and cannot be deleted. Please archive it instead.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedCompany(null);
        return;
      }

      await deleteDoc(
        doc(
          firestore,
          'firms',
          profile.firmId,
          'companies',
          selectedCompany.id
        )
      );

      toast({
        title: 'Company Deleted Successfully',
        description: `${selectedCompany.companyName} has been permanently removed.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Company',
        description:
          'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedCompany || !firestore || !profile?.firmId) return;
    const companyRef = doc(
      firestore,
      'firms',
      profile.firmId,
      'companies',
      selectedCompany.id
    );
    await updateDoc(companyRef, { status: 'Archived' });
    toast({
      title: 'Company Archived',
      description: `${selectedCompany.companyName} has been archived.`,
    });
    setIsArchiveDialogOpen(false);
    setSelectedCompany(null);
    setActiveTab('archived');
  };

  const handleRestoreCompany = async (company: Company) => {
    if (!firestore || !profile?.firmId) return;
    const companyRef = doc(
      firestore,
      'firms',
      profile.firmId,
      'companies',
      company.id
    );
    await updateDoc(companyRef, { status: 'Active' });
    toast({
      title: 'Company Restored',
      description: `${company.companyName} has been moved to the active list.`,
    });
    setActiveTab('active');
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const openArchiveDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsArchiveDialogOpen(true);
  };

  const getFinancialYearString = (start: Date, end: Date) => {
    const startDate = start instanceof Date ? start : (start as any).toDate();
    const endDate = end instanceof Date ? end : (end as any).toDate();
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear().toString().slice(-2);
    return `${startYear}-${endYear}`;
  };

  const renderCompanyActions = (company: Company, isArchived: boolean) => {
    if (!canManage) return null;

    if (isArchived) {
      return (
        <DropdownMenuItem onClick={() => handleRestoreCompany(company)}>
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Restore
        </DropdownMenuItem>
      );
    }

    return (
      <>
        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openArchiveDialog(company)}>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>
      </>
    );
  };

  const renderCompanyTable = (companyList: Company[], isArchived: boolean) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Financial Year</TableHead>
              <TableHead>GST Status</TableHead>
              {canManage && (
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingCompanies ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 4 : 3}
                  className="h-24 text-center"
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : companyList.length > 0 ? (
              companyList.map((company) => (
                <TableRow
                  key={company.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {company.companyName}
                  </TableCell>
                  <TableCell>
                    {getFinancialYearString(
                      company.financialYearStart,
                      company.financialYearEnd
                    )}
                  </TableCell>
                  <TableCell>
                    {company.gstin ? (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        Registered
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Unregistered</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {renderCompanyActions(company, isArchived)}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(company)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 4 : 3}
                  className="h-24 text-center"
                >
                  No {isArchived ? 'archived' : 'active'} companies.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Companies</h1>
          {canManage && profile?.firmId && (
            <AddCompanySheet
              open={isAddSheetOpen}
              onOpenChange={setIsAddSheetOpen}
              onCompanyCreated={onCompanyCreated}
              firmId={profile.firmId}
            >
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </AddCompanySheet>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">
              Archived{' '}
              <Badge variant="secondary" className="ml-2">
                {archivedCompanies.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderCompanyTable(activeCompanies, false)}
          </TabsContent>
          <TabsContent value="archived">
            {renderCompanyTable(archivedCompanies, true)}
          </TabsContent>
        </Tabs>
      </div>

      <DeleteCompanyDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        company={selectedCompany}
        onConfirm={handleDeleteConfirm}
      />
      <ArchiveCompanyDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        company={selectedCompany}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
