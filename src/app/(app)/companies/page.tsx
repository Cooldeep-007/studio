'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockCompanies, mockVouchers } from '@/lib/data';
import type { Company } from '@/lib/types';
import { AddCompanySheet } from '@/components/add-company-sheet';
import { DeleteCompanyDialog } from '@/components/delete-company-dialog';
import { useToast } from '@/hooks/use-toast';

export default function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>(mockCompanies);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(
    null
  );
  const { toast } = useToast();

  const handleAddCompany = (newCompany: Company) => {
    setCompanies((prev) => [...prev, newCompany]);
    toast({
      title: 'Company Created Successfully',
      description: `${newCompany.companyName} has been added.`,
    });
  };

  const handleDeleteCompany = () => {
    if (!selectedCompany) return;

    // As per specification, check for transactions before deleting.
    const hasTransactions = mockVouchers.some(
      (v) => v.companyId === selectedCompany.id
    );

    if (hasTransactions) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `Company "${selectedCompany.companyName}" cannot be deleted as it has existing financial records. Consider archiving it instead.`,
      });
      setIsAlertOpen(false); // Close the dialog
      setSelectedCompany(null);
      return;
    }

    setCompanies((prev) =>
      prev.filter((c) => c.id !== selectedCompany.id)
    );
    toast({
      title: 'Company Deleted Successfully',
      description: `${selectedCompany.companyName} has been removed.`,
    });
    setSelectedCompany(null);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsAlertOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Companies</h1>
          <AddCompanySheet
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            onCompanyCreated={handleAddCompany}
          >
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </AddCompanySheet>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Companies</CardTitle>
            <CardDescription>
              A list of companies managed under your firm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[50px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {company.companyName}
                    </TableCell>
                    <TableCell>{company.gstin}</TableCell>
                    <TableCell>{company.address}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <DeleteCompanyDialog
        open={isAlertOpen}
        onOpenChange={setIsAlertOpen}
        company={selectedCompany}
        onConfirm={handleDeleteCompany}
      />
    </>
  );
}
