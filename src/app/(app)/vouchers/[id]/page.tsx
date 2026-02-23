'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

import { mockVouchers, mockLedgers } from '@/lib/data';
import type { Voucher } from '@/lib/types';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const badgeColors: Record<string, string> = {
  Sales: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  Purchase: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  Payment: 'bg-red-100 text-red-800 hover:bg-red-100/80',
  Receipt: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
  Journal: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
  Contra: 'bg-orange-100 text-orange-800 hover:bg-orange-100/80',
  'Debit Note': 'bg-pink-100 text-pink-800 hover:bg-pink-100/80',
  'Credit Note': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80',
};


export default function VoucherViewPage() {
  const params = useParams();
  const router = useRouter();
  const voucherId = params.id as string;
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  const voucher: Voucher | undefined = React.useMemo(() => {
    return mockVouchers.find(v => v.id === voucherId);
  }, [voucherId]);

  const ledgerMap = React.useMemo(() => new Map(mockLedgers.map(l => [l.id, l])), []);
  
  const handleExport = (formatType: 'pdf' | 'xlsx') => {
    if (!voucher) return;
    setIsExporting(true);
    toast({ title: 'Exporting...', description: `Your voucher is being exported as a ${formatType.toUpperCase()} file.` });

    setTimeout(() => {
      try {
        if (formatType === 'pdf') {
          exportVoucherToPdf();
        } else {
          exportVoucherToXlsx();
        }
        toast({ title: 'Export Successful', description: 'Your file has been downloaded.' });
      } catch (error) {
        console.error("Export failed:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'An unexpected error occurred.' });
      } finally {
        setIsExporting(false);
      }
    }, 1000);
  };

  const exportVoucherToPdf = () => {
    if (!voucher) return;
    const doc = new jsPDF();
    const partyLedgerName = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName : 'N/A';
    
    doc.setFontSize(18);
    doc.text(`Voucher: ${voucher.voucherNumber}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Type: ${voucher.voucherType}`, 14, 30);
    doc.text(`Date: ${format(new Date(voucher.date), 'dd MMM, yyyy')}`, doc.internal.pageSize.getWidth() - 14, 30, { align: 'right' });

    if (voucher.partyLedgerId) {
      doc.text(`Party: ${partyLedgerName}`, 14, 38);
    }
    (doc as any).autoTable({
      startY: 45,
      head: [['Particulars', 'Debit', 'Credit']],
      body: voucher.entries.map(entry => [
        ledgerMap.get(entry.ledgerId)?.ledgerName || 'Unknown Ledger',
        entry.type === 'Dr' ? formatCurrency(entry.amount) : '',
        entry.type === 'Cr' ? formatCurrency(entry.amount) : '',
      ]),
      foot: [
        ['Total', formatCurrency(voucher.totalDebit), formatCurrency(voucher.totalCredit)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      footStyles: { fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    if (voucher.narration) {
      doc.setFontSize(10);
      doc.text('Narration:', 14, finalY + 10);
      doc.text(voucher.narration, 14, finalY + 15, { maxWidth: doc.internal.pageSize.getWidth() - 28 });
    }

    doc.save(`Voucher_${voucher.voucherNumber}.pdf`);
  };

  const exportVoucherToXlsx = () => {
    if (!voucher) return;
    const partyLedgerName = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName : 'N/A';

    const header = [
      ['Voucher No.', voucher.voucherNumber],
      ['Voucher Type', voucher.voucherType],
      ['Date', format(new Date(voucher.date), 'dd-MM-yyyy')],
    ];
    if(voucher.partyLedgerId) header.push(['Party', partyLedgerName]);
    
    const ws_data = [
      ...header,
      [],
      ['Particulars', 'Debit', 'Credit'],
      ...voucher.entries.map(entry => [
        ledgerMap.get(entry.ledgerId)?.ledgerName || 'Unknown Ledger',
        entry.type === 'Dr' ? entry.amount : null,
        entry.type === 'Cr' ? entry.amount : null,
      ]),
      ['Total', voucher.totalDebit, voucher.totalCredit],
      [],
      ['Narration', voucher.narration || '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Formatting
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }];
    const totalRowIndex = header.length + 2 + voucher.entries.length + 1;
    
    const numberFormat = '#,##0.00';
    voucher.entries.forEach((_, index) => {
        const rowIndex = header.length + 2 + index + 1;
        if (ws[`B${rowIndex}`]) ws[`B${rowIndex}`].s = { numFmt: numberFormat };
        if (ws[`C${rowIndex}`]) ws[`C${rowIndex}`].s = { numFmt: numberFormat };
    });
    
    if (ws[`B${totalRowIndex}`]) ws[`B${totalRowIndex}`].s = { font: { bold: true }, numFmt: numberFormat };
    if (ws[`C${totalRowIndex}`]) ws[`C${totalRowIndex}`].s = { font: { bold: true }, numFmt: numberFormat };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voucher');
    XLSX.writeFile(wb, `Voucher_${voucher.voucherNumber}.xlsx`);
  };

  if (!voucher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voucher Not Found</CardTitle>
          <CardDescription>The voucher you are looking for does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </CardContent>
      </Card>
    );
  }

  const partyLedgerName = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName : 'N/A';

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vouchers
        </Button>
        <div className="flex gap-2">
            <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => handleExport('pdf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleExport('xlsx')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export as Excel
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href={`/vouchers/${voucher.id}/edit`}>
                <Button>
                    <Edit className="mr-2 h-4 w-4" /> Edit Voucher
                </Button>
            </Link>
        </div>
      </div>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="bg-muted/50 p-6">
            <div className="flex justify-between items-start">
                <div>
                    <Badge className={badgeColors[voucher.voucherType]}>{voucher.voucherType}</Badge>
                    <h2 className="text-2xl font-bold mt-2">{voucher.voucherNumber}</h2>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold">{format(new Date(voucher.date), 'dd MMM, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">Voucher Date</p>
                </div>
            </div>
            {voucher.partyLedgerId && (
                <div className="pt-4">
                    <p className="text-sm text-muted-foreground">Party</p>
                    <p className="font-medium">{partyLedgerName}</p>
                </div>
            )}
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">Transaction Details</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {voucher.entries.map((entry, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{ledgerMap.get(entry.ledgerId)?.ledgerName}</TableCell>
                                <TableCell className="text-right font-mono">{entry.type === 'Dr' ? formatCurrency(entry.amount) : ''}</TableCell>
                                <TableCell className="text-right font-mono">{entry.type === 'Cr' ? formatCurrency(entry.amount) : ''}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Separator />
                <div className="flex justify-end">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 w-full max-w-xs">
                        <span className="font-semibold">Total Debit</span>
                        <span className="text-right font-semibold font-mono">{formatCurrency(voucher.totalDebit)}</span>
                        <span className="font-semibold">Total Credit</span>
                        <span className="text-right font-semibold font-mono">{formatCurrency(voucher.totalCredit)}</span>
                    </div>
                </div>
            </div>
            {voucher.narration && (
                <div className="mt-6">
                    <p className="text-sm font-medium text-muted-foreground">Narration</p>
                    <p className="mt-1 p-3 bg-secondary rounded-md text-sm">{voucher.narration}</p>
                </div>
            )}
        </CardContent>
         <CardFooter className="bg-muted/50 p-4 text-xs text-muted-foreground text-center justify-center">
            <p>Created on {format(new Date(voucher.createdAt), 'PPpp')}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
