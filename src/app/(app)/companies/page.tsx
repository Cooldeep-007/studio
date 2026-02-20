'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle, Archive, ArchiveRestore } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { mockCompanies, mockVouchers } from '@/lib/data';
import type { Company } from '@/lib/types';
import { AddCompanySheet } from '@/components/add-company-sheet';
import { DeleteCompanyDialog } from '@/components/delete-company-dialog';
import { ArchiveCompanyDialog } from '@/components/archive-company-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from "@/components/ui/badge";

export default function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies);
  const [activeTab, setActiveTab] = React.useState("active");
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(
    null
  );
  const { toast } = useToast();

  const activeCompanies = companies.filter((c) => c.status === 'Active');
  const archivedCompanies = companies.filter((c) => c.status === 'Archived');

  const handleAddCompany = (newCompany: Company) => {
    setCompanies((prev) => [...prev, newCompany]);
    toast({
      title: 'Company Created Successfully',
      description: `${newCompany.companyName} has been added.`,
    });
    setActiveTab('active');
  };

  const handleDeleteConfirm = () => {
    if (!selectedCompany) return;

    const hasTransactions = mockVouchers.some(
      (v) => v.companyId === selectedCompany.id
    );

    if (hasTransactions) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `Company "${selectedCompany.companyName}" has existing financial records and cannot be deleted. Please archive it instead.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
      return;
    }

    setCompanies((prev) =>
      prev.filter((c) => c.id !== selectedCompany.id)
    );
    toast({
      title: 'Company Deleted Successfully',
      description: `${selectedCompany.companyName} has been permanently removed.`,
    });
    setSelectedCompany(null);
  };
  
  const handleArchiveConfirm = () => {
    if (!selectedCompany) return;
    setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, status: 'Archived' } : c));
    toast({
      title: 'Company Archived',
      description: `${selectedCompany.companyName} has been archived.`,
    });
    setSelectedCompany(null);
    setActiveTab('archived');
  };

  const handleRestoreCompany = (company: Company) => {
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: 'Active' } : c));
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
    const startYear = start.getFullYear();
    const endYear = end.getFullYear().toString().slice(-2);
    return `${startYear}-${endYear}`;
  }

  const renderCompanyActions = (company: Company, isArchived: boolean) => {
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
        <DropdownMenuItem>Edit</DropdownMenuItem>
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
              <TableHead className="w-[50px] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companyList.length > 0 ? companyList.map((company) => (
              <TableRow
                key={company.id}
                className="transition-colors hover:bg-muted/50"
              >
                <TableCell className="font-medium">
                  {company.companyName}
                </TableCell>
                <TableCell>
                  {getFinancialYearString(company.financialYearStart, company.financialYearEnd)}
                </TableCell>
                <TableCell>
                  {company.gstin ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">Registered</Badge>
                  ) : (
                    <Badge variant="secondary">Unregistered</Badge>
                  )}
                </TableCell>
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
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
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
          <AddCompanySheet
            open={isAddSheetOpen}
            onOpenChange={setIsAddSheetOpen}
            onCompanyCreated={handleAddCompany}
          >
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </AddCompanySheet>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">
                Archived <Badge variant="secondary" className="ml-2">{archivedCompanies.length}</Badge>
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
