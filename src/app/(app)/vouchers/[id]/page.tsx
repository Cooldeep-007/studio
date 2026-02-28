'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { doc, collection } from 'firebase/firestore';
import type { Voucher, Company, Ledger } from '@/lib/types';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const toWords = (num: number): string => {
    if (num === 0) return 'Zero Rupees Only';

    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n: number): string => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            str += a[n] + ' ';
        }
        return str;
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundreds = Math.floor(num);
    const paisa = Math.round((num - hundreds) * 100);

    if (crore > 0) result += inWords(crore) + 'Crore ';
    if (lakh > 0) result += inWords(lakh) + 'Lakh ';
    if (thousand > 0) result += inWords(thousand) + 'Thousand ';
    if (hundreds > 0) result += inWords(hundreds);

    result = result.trim();
    if (result) result += ' Rupees';
    if (paisa > 0) {
        result += (result ? ' and ' : '') + inWords(paisa) + ' Paisa';
    }

    return result.trim() + ' Only';
};


const badgeColors: Record<string, string> = {
  Sales: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  'Adhoc Sale': 'bg-green-100 text-green-800 hover:bg-green-100/80',
  Purchase: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  'Adhoc Purchase': 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
  Payment: 'bg-red-100 text-red-800 hover:bg-red-100/80',
  Receipt: 'bg-purple-100 text-purple-800 hover:bg-purple-100/80',
  Journal: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
  Contra: 'bg-orange-100 text-orange-800 hover:bg-orange-100/80',
  'Debit Note': 'bg-pink-100 text-pink-800 hover:bg-pink-100/80',
  'Credit Note': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80',
  'Proforma Invoice': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80',
};


export default function VoucherViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();
  const { profile } = useUser();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  const voucherId = params.id as string;
  const companyId = searchParams.get('companyId');

  const voucherRef = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId || !voucherId) return null;
    return doc(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers', voucherId);
  }, [firestore, profile?.firmId, companyId, voucherId]);
  const { data: voucher, isLoading: isLoadingVoucher } = useDoc<Voucher>(voucherRef);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId) return null;
    return doc(firestore, 'firms', profile.firmId, 'companies', companyId);
  }, [firestore, profile?.firmId, companyId]);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const ledgersRef = useMemoFirebase(() => {
    if (!firestore || !profile?.firmId || !companyId) return null;
    return collection(firestore, 'firms', profile.firmId, 'companies', companyId, 'ledgers');
  }, [firestore, profile?.firmId, companyId]);
  const { data: ledgers, isLoading: isLoadingLedgers } = useCollection<Ledger>(ledgersRef);

  const ledgerMap = React.useMemo(() => {
    if (!ledgers) return new Map();
    return new Map(ledgers.map(l => [l.id, l]));
  }, [ledgers]);

  const calculations = React.useMemo(() => {
    if (!voucher?.invoiceDetails) return null;
    const { items } = voucher.invoiceDetails;
    let subtotal = 0;
    let totalGst = 0;
    
    items.forEach(item => {
        subtotal += item.amount;
        totalGst += item.cgst + item.sgst + item.igst;
    });

    const grandTotal = voucher.invoiceDetails.grandTotal || subtotal + totalGst + (voucher.invoiceDetails.roundOff || 0);

    return { subtotal, totalGst, grandTotal };
  }, [voucher]);


  const handleExport = (formatType: 'pdf' | 'xlsx') => {
    if (!voucher || !company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Voucher or Company data not found.' });
        return;
    };
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
    if (!voucher || !company) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let y = 15;
    const margin = 14;

    // 1. Company Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(company.address || '', margin, y);
    y += 5;
    doc.text(`GSTIN: ${company.gstin || 'N/A'}`, margin, y);

    // 2. Document Title
    const isTaxInvoice = voucher.voucherType === 'Sales' && voucher.invoiceDetails;
    const title = isTaxInvoice ? 'Tax Invoice' : voucher.voucherType.toUpperCase();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth - margin, 15, { align: 'right' });

    y += 10;
    doc.setDrawColor(220); // Lighter gray
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // 3. Voucher & Party Details
    const partyLedger = ledgerMap.get(voucher.partyLedgerId || '');
    const partyAddress = partyLedger?.contactDetails?.addressLine1 || '';
    const partyGstin = partyLedger?.gstDetails?.gstin || 'N/A';

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(voucher.voucherType === 'Payment' ? 'Paid To:' : (voucher.voucherType === 'Receipt' ? 'Received From:' : 'Bill To:'), margin, y);
    doc.text('Voucher No:', pageWidth / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(voucher.voucherNumber, pageWidth / 2 + 30, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(partyLedger?.ledgerName || 'N/A', margin, y);
    doc.setFont('helvetica', 'normal');
    const voucherDate = voucher.date instanceof Date ? voucher.date : (voucher.date as any).toDate();
    doc.text('Date:', pageWidth / 2, y);
    doc.text(format(voucherDate, 'dd MMM, yyyy'), pageWidth / 2 + 30, y);
    y += 5;
    
    const addressLines = doc.splitTextToSize(partyAddress, 80);
    doc.text(addressLines, margin, y);
    y += (addressLines.length * 4) + 1; // Add padding

    doc.text(`GSTIN: ${partyGstin}`, margin, y);
    
    if (voucher.invoiceDetails?.placeOfSupply) {
         y += 5;
         doc.setFont('helvetica', 'bold');
         doc.text('Place of Supply:', margin, y);
         doc.setFont('helvetica', 'normal');
         doc.text(voucher.invoiceDetails.placeOfSupply, margin + 35, y);
    }
    y += 10;

    // 4. Table
    if (isTaxInvoice && voucher.invoiceDetails) {
        (doc as any).autoTable({
            startY: y,
            head: [['#', 'Item Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount']],
            body: voucher.invoiceDetails.items.map((item, index) => [
                index + 1, item.name, item.hsnCode || item.sacCode || '-', `${item.quantity} ${item.uqc}`, formatCurrency(item.rate), formatCurrency(item.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
            columnStyles: { 0: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
        });
    } else {
        (doc as any).autoTable({
            startY: y,
            head: [['Particulars', 'Debit', 'Credit']],
            body: voucher.entries.map(entry => [
                ledgerMap.get(entry.ledgerId)?.ledgerName || 'Unknown Ledger',
                entry.type === 'Dr' ? formatCurrency(entry.amount) : '',
                entry.type === 'Cr' ? formatCurrency(entry.amount) : '',
            ]),
            foot: [['Total', formatCurrency(voucher.totalDebit), formatCurrency(voucher.totalCredit)]],
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
            footStyles: { fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });
    }
    
    y = (doc as any).lastAutoTable.finalY;

    // 5. Totals Section & Narration
    const totalsX = pageWidth - margin - 80;
    const narrationWidth = isTaxInvoice ? totalsX - margin - 10 : pageWidth - (margin * 2);

    if (voucher.narration) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Narration:', margin, y + 10);
        doc.setFont('helvetica', 'normal');
        const narrationLines = doc.splitTextToSize(voucher.narration, narrationWidth);
        doc.text(narrationLines, margin, y + 15);
    }
    
    if (isTaxInvoice && voucher.invoiceDetails && calculations) {
        const { grandTotal, subtotal, totalGst } = voucher.invoiceDetails;
        let cgst = 0, sgst = 0, igst = 0;
        voucher.invoiceDetails.items.forEach(i => {
            cgst += i.cgst;
            sgst += i.sgst;
            igst += i.igst;
        });

        const valueX = pageWidth - margin;
        let totalY = y + 10;
        doc.setFontSize(10);
        
        const drawTotalLine = (label: string, value: string, isBold = false) => {
             if (isBold) doc.setFont('helvetica', 'bold');
             doc.text(label, totalsX, totalY, { align: 'left' });
             doc.text(value, valueX, totalY, { align: 'right' });
             if (isBold) doc.setFont('helvetica', 'normal');
             totalY += 7;
        }

        drawTotalLine('Subtotal:', formatCurrency(subtotal));
        if (cgst > 0) drawTotalLine('CGST:', formatCurrency(cgst));
        if (sgst > 0) drawTotalLine('SGST:', formatCurrency(sgst));
        if (igst > 0) drawTotalLine('IGST:', formatCurrency(igst));
        if (voucher.invoiceDetails.roundOff) drawTotalLine('Round Off:', voucher.invoiceDetails.roundOff.toFixed(2));
        
        totalY += 1;
        doc.setDrawColor(220);
        doc.line(totalsX, totalY, pageWidth - margin, totalY);
        totalY += 1;
        
        drawTotalLine('Grand Total:', formatCurrency(grandTotal), true);
        y = totalY;
        
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Amount in Words:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`(Indian Rupees ${toWords(grandTotal)})`, margin, y + 4, { maxWidth: narrationWidth });
    }

    // 7. Signature block
    const signatureY = pageHeight - 30;
    doc.setDrawColor(220);
    doc.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
    doc.setFontSize(10);
    doc.text('Authorised Signatory', pageWidth - margin - 35, signatureY + 5, { align: 'center' });
    doc.text(`For ${company.companyName}`, pageWidth - margin - 35, signatureY + 10, { align: 'center' });

    // 8. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.text(`This is a computer generated document.`, margin, pageHeight - 10, { align: 'left' });
    }

    doc.save(`Voucher_${voucher.voucherNumber}.pdf`);
  };

  const exportVoucherToXlsx = () => {
    if (!voucher || !company) return;
    const partyLedgerName = voucher.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName : 'N/A';
    const isTaxInvoice = voucher.voucherType === 'Sales' && voucher.invoiceDetails;

    const wb = XLSX.utils.book_new();
    let ws_data: (string | number | null | Date)[][] = [];

    // Header
    ws_data.push([company.companyName]);
    ws_data.push([isTaxInvoice ? "Tax Invoice" : voucher.voucherType.toUpperCase()]);
    ws_data.push([]);
    const voucherDate = voucher.date instanceof Date ? voucher.date : (voucher.date as any).toDate();
    ws_data.push(['Voucher No.', voucher.voucherNumber, 'Date', format(voucherDate, 'dd-MM-yyyy')]);
    ws_data.push(['Party', partyLedgerName]);
    ws_data.push([]);

    if (isTaxInvoice && voucher.invoiceDetails && calculations) {
        ws_data.push(['#', 'Item', 'HSN/SAC', 'Qty', 'UQC', 'Rate', 'Discount %', 'Taxable Amount', 'GST %', 'GST Amt', 'Total']);
        voucher.invoiceDetails.items.forEach((item, index) => {
            const gstAmt = item.cgst + item.sgst + item.igst;
            ws_data.push([
                index + 1, item.name, item.hsnCode || item.sacCode || '', item.quantity,
                item.uqc, item.rate, item.discount || 0, item.amount, item.gstRate, gstAmt, item.total
            ]);
        });
        ws_data.push([]);
        ws_data.push([null, null, null, null, null, null, null, 'Subtotal', voucher.invoiceDetails.subtotal]);
        ws_data.push([null, null, null, null, null, null, null, 'Total GST', voucher.invoiceDetails.totalGst]);
        if (voucher.invoiceDetails.roundOff) {
            ws_data.push([null, null, null, null, null, null, null, 'Round Off', voucher.invoiceDetails.roundOff]);
        }
        ws_data.push([null, null, null, null, null, null, null, 'Grand Total', voucher.invoiceDetails.grandTotal]);
    } else {
        ws_data.push(['Particulars', 'Debit', 'Credit']);
        voucher.entries.forEach(entry => {
            ws_data.push([
                ledgerMap.get(entry.ledgerId)?.ledgerName || 'Unknown Ledger',
                entry.type === 'Dr' ? entry.amount : null,
                entry.type === 'Cr' ? entry.amount : null,
            ]);
        });
        ws_data.push([]);
        ws_data.push(['Total', voucher.totalDebit, voucher.totalCredit]);
    }
    
    ws_data.push([]);
    ws_data.push(['Narration', voucher.narration || '']);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    const colWidths = isTaxInvoice
      ? [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 15 }]
      : [{ wch: 40 }, { wch: 15 }, { wch: 15 }];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Voucher');
    XLSX.writeFile(wb, `Voucher_${voucher.voucherNumber}.xlsx`);
  };
  
  const isLoading = isLoadingVoucher || isLoadingCompany || isLoadingLedgers;

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }


  if (!voucher || !company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voucher Not Found</CardTitle>
          <CardDescription>The voucher or associated company could not be found.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </CardContent>
      </Card>
    );
  }

  const voucherDate = voucher.date instanceof Date ? voucher.date : (voucher.date as any).toDate();
  const createdAtDate = voucher.createdAt instanceof Date ? voucher.createdAt : (voucher.createdAt as any).toDate();

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vouchers
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
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
            <Link href={`/vouchers/${voucher.id}/edit?companyId=${companyId}`}>
                <Button>
                    <Edit className="mr-2 h-4 w-4" /> Edit Voucher
                </Button>
            </Link>
        </div>
      </div>
      <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-none">
        <CardHeader className="bg-muted/50 p-6 print:bg-transparent">
            <div className="flex justify-between items-start">
                <div>
                    <Badge className={badgeColors[voucher.voucherType]}>{voucher.voucherType}</Badge>
                    <h2 className="text-2xl font-bold mt-2">{voucher.voucherNumber}</h2>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold">{format(voucherDate, 'dd MMM, yyyy')}</p>
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
         <CardFooter className="bg-muted/50 p-4 text-xs text-muted-foreground text-center justify-center print:hidden">
            <p>Created on {format(createdAtDate, 'PPpp')}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
