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
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  MapPin,
  Hash,
  Settings2,
  Phone,
  Mail,
  IndianRupee,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { doc, collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { Voucher, Company, Ledger, InvoiceItem } from '@/lib/types';
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
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState(0);
  const [paymentDate, setPaymentDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = React.useState('');
  const [paymentLedgerId, setPaymentLedgerId] = React.useState('');
  const [paymentRef, setPaymentRef] = React.useState('');
  const [paymentNarration, setPaymentNarration] = React.useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const [linkedPayments, setLinkedPayments] = React.useState<Voucher[]>([]);
  const [showConfigDialog, setShowConfigDialog] = React.useState(false);
  const [printConfig, setPrintConfig] = React.useState({
    companyPartyInfo: true,
    invoiceMeta: true,
    itemsTable: true,
    taxSummary: true,
    amountInWords: true,
    outstanding: true,
    narration: true,
    remarks: true,
    accountingEntries: false,
    paymentHistory: true,
  });

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

  const partyLedgerName = voucher?.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId)?.ledgerName || 'N/A' : 'N/A';

  const composeAddress = (obj: { addressLine1?: string; addressLine2?: string; city?: string; district?: string; state?: string; country?: string; pincode?: string; address?: string } | undefined | null): string => {
    if (!obj) return '';
    const parts = [obj.addressLine1, obj.addressLine2, obj.city, obj.district, obj.state, obj.pincode, obj.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (obj as any)?.address || '';
  };

  const calculations = React.useMemo(() => {
    if (!voucher?.invoiceDetails) return null;
    const { items } = voucher.invoiceDetails;
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    items.forEach(item => {
        subtotal += item.amount;
        totalCgst += item.cgst;
        totalSgst += item.sgst;
        totalIgst += item.igst;
    });

    const totalGst = totalCgst + totalSgst + totalIgst;
    const grandTotal = voucher.invoiceDetails.grandTotal || subtotal + totalGst + (voucher.invoiceDetails.roundOff || 0);

    return { subtotal, totalCgst, totalSgst, totalIgst, totalGst, grandTotal };
  }, [voucher]);

  const toggleConfig = (key: keyof typeof printConfig) => {
    setPrintConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const partyLedger = voucher?.partyLedgerId ? ledgerMap.get(voucher.partyLedgerId) : null;

  const bankCashLedgers = React.useMemo(() => {
    if (!ledgers) return [];
    return ledgers.filter(l => l.group === 'Bank Accounts' || l.group === 'Cash-in-Hand');
  }, [ledgers]);

  const isInvoiceType = voucher?.voucherType === 'Sales' || voucher?.voucherType === 'Purchase' || voucher?.voucherType === 'Adhoc Sale' || voucher?.voucherType === 'Adhoc Purchase' || voucher?.voucherType === 'Credit Note' || voucher?.voucherType === 'Debit Note';
  const isSaleType = voucher?.voucherType === 'Sales' || voucher?.voucherType === 'Adhoc Sale' || voucher?.voucherType === 'Debit Note';
  const paymentLabel = isSaleType ? 'Record Receipt' : 'Record Payment';

  React.useEffect(() => {
    if (!firestore || !profile?.firmId || !companyId || !voucherId) return;
    const fetchLinkedPayments = async () => {
      const vouchersCol = collection(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers');
      const q = query(vouchersCol, where('billAllocations', '!=', null));
      const snapshot = await getDocs(q);
      const linked: Voucher[] = [];
      snapshot.forEach(d => {
        const v = { id: d.id, ...d.data() } as Voucher;
        if (v.billAllocations?.some(b => b.voucherId === voucherId)) {
          linked.push(v);
        }
      });
      setLinkedPayments(linked);
    };
    fetchLinkedPayments();
  }, [firestore, profile?.firmId, companyId, voucherId]);

  const openPaymentDialog = () => {
    const outstanding = voucher?.outstandingAmount ?? voucher?.totalDebit ?? 0;
    setPaymentAmount(outstanding);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMode('');
    setPaymentLedgerId('');
    setPaymentRef('');
    setPaymentNarration(isSaleType ? `Receipt against ${voucher?.voucherNumber}` : `Payment against ${voucher?.voucherNumber}`);
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!firestore || !profile?.firmId || !companyId || !voucher) return;
    if (!voucher.partyLedgerId) {
      toast({ variant: 'destructive', title: 'Error', description: 'This voucher has no party ledger. Cannot record payment.' });
      return;
    }
    if (!paymentLedgerId || paymentAmount <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a bank/cash ledger and enter a valid amount.' });
      return;
    }
    const maxOutstanding = voucher.outstandingAmount ?? voucher.invoiceDetails?.grandTotal ?? voucher.totalDebit;
    if (paymentAmount > maxOutstanding) {
      toast({ variant: 'destructive', title: 'Error', description: `Amount cannot exceed outstanding balance of ${formatCurrency(maxOutstanding)}.` });
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const voucherType = isSaleType ? 'Receipt' : 'Payment';
      const entries = isSaleType
        ? [
            { ledgerId: paymentLedgerId, type: 'Dr' as const, amount: paymentAmount },
            { ledgerId: voucher.partyLedgerId!, type: 'Cr' as const, amount: paymentAmount },
          ]
        : [
            { ledgerId: voucher.partyLedgerId!, type: 'Dr' as const, amount: paymentAmount },
            { ledgerId: paymentLedgerId, type: 'Cr' as const, amount: paymentAmount },
          ];

      const newPaymentVoucher: any = {
        voucherNumber: `${voucherType.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        voucherType,
        date: new Date(paymentDate),
        createdAt: serverTimestamp(),
        narration: paymentNarration,
        entries,
        totalDebit: paymentAmount,
        totalCredit: paymentAmount,
        firmId: profile.firmId,
        companyId,
        createdByUserId: profile.uid || 'user',
        isReconciled: false,
        isCancelled: false,
        partyLedgerId: voucher.partyLedgerId,
        paymentMode,
        referenceNumber: paymentRef || undefined,
        billAllocations: [
          { voucherId: voucher.id, voucherNumber: voucher.voucherNumber, amount: paymentAmount }
        ],
        status: 'Paid',
      };

      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(removeUndefined);
        if (obj instanceof Date) return obj;
        if (typeof obj === 'object' && '_methodName' in obj) return obj;
        const cleaned: any = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v !== undefined) {
            cleaned[k] = typeof v === 'object' && v !== null && !(v instanceof Date) && !('_methodName' in (v as any))
              ? removeUndefined(v) : v;
          }
        }
        return cleaned;
      };

      const vouchersCol = collection(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers');
      const newDocRef = await addDoc(vouchersCol, removeUndefined(newPaymentVoucher));

      const currentOutstanding = voucher.outstandingAmount ?? voucher.invoiceDetails?.grandTotal ?? voucher.totalDebit;
      const newOutstanding = Math.max(0, currentOutstanding - paymentAmount);
      const newStatus = newOutstanding <= 0 ? 'Paid' : 'Partial';

      const voucherDocRef = doc(firestore, 'firms', profile.firmId, 'companies', companyId, 'vouchers', voucher.id);
      await updateDoc(voucherDocRef, {
        outstandingAmount: newOutstanding,
        status: newStatus,
      });

      toast({ title: `${voucherType} Recorded`, description: `${formatCurrency(paymentAmount)} ${voucherType.toLowerCase()} recorded against ${voucher.voucherNumber}.` });
      setShowPaymentDialog(false);

      setLinkedPayments(prev => [...prev, { ...removeUndefined(newPaymentVoucher), id: newDocRef.id, createdAt: new Date() } as any]);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment. Please try again.' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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
    doc.text(composeAddress(company) || '', margin, y);
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
    const partyAddress = composeAddress(partyLedger?.contactDetails) || '';
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
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
                <Settings2 className="mr-2 h-4 w-4" /> Configure
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
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
        <CardHeader className="p-6 print:bg-transparent">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <Badge className={badgeColors[voucher.voucherType]}>{voucher.voucherType}</Badge>
                        {voucher.status && (
                            <Badge variant={voucher.status === 'Paid' ? 'default' : voucher.status === 'Partial' ? 'secondary' : 'destructive'}
                                className={voucher.status === 'Paid' ? 'bg-green-100 text-green-800' : voucher.status === 'Partial' ? 'bg-amber-100 text-amber-800' : ''}>
                                {voucher.status === 'Paid' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {voucher.status === 'Partial' && <Clock className="mr-1 h-3 w-3" />}
                                {voucher.status === 'Unpaid' && <AlertCircle className="mr-1 h-3 w-3" />}
                                {voucher.status}
                            </Badge>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold mt-2">{voucher.voucherNumber}</h2>
                    {isInvoiceType && <p className="text-sm text-muted-foreground mt-1">{voucher.voucherType === 'Sales' || voucher.voucherType === 'Adhoc Sale' ? 'Tax Invoice' : 'Purchase Invoice'}</p>}
                </div>
                <div className="text-right space-y-1">
                    <p className="text-lg font-semibold">{format(voucherDate, 'dd MMM, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">Voucher Date</p>
                    {voucher.invoiceDetails?.dueDate && (
                        <>
                            <p className="text-sm font-medium">{format(voucher.invoiceDetails.dueDate instanceof Date ? voucher.invoiceDetails.dueDate : (voucher.invoiceDetails.dueDate as any).toDate(), 'dd MMM, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">Due Date</p>
                        </>
                    )}
                </div>
            </div>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-6">
            {isInvoiceType && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg ${!printConfig.companyPartyInfo ? 'print:hidden' : ''}`} data-section="companyPartyInfo">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{isSaleType ? 'From (Seller)' : 'To (Supplier)'}</p>
                        <div className="space-y-1">
                            <p className="font-semibold text-lg flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{company.companyName}</p>
                            {company.gstin && <p className="text-sm text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />GSTIN: {company.gstin}</p>}
                            {company.pan && <p className="text-sm text-muted-foreground">PAN: {company.pan}</p>}
                            {composeAddress(company) && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{composeAddress(company)}</p>}
                            {company.state && <p className="text-sm text-muted-foreground">State: {company.state}</p>}
                            {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
                            {(company.mobileNumber || company.telephone) && <p className="text-sm text-muted-foreground">{company.mobileNumber || company.telephone}</p>}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{isSaleType ? 'To (Buyer)' : 'From (Vendor)'}</p>
                        <div className="space-y-1">
                            <p className="font-semibold text-lg">{partyLedgerName}</p>
                            {partyLedger?.gstDetails?.gstin && <p className="text-sm text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />GSTIN: {partyLedger.gstDetails.gstin}</p>}
                            {partyLedger?.gstDetails?.gstType && <p className="text-sm text-muted-foreground">GST Type: {partyLedger.gstDetails.gstType}</p>}
                            {partyLedger?.contactDetails?.pan && <p className="text-sm text-muted-foreground">PAN: {partyLedger.contactDetails.pan}</p>}
                            {composeAddress(partyLedger?.contactDetails) && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{composeAddress(partyLedger?.contactDetails)}</p>
                            )}
                            {partyLedger?.contactDetails?.state && <p className="text-sm text-muted-foreground">State: {partyLedger.contactDetails.state}</p>}
                            {partyLedger?.contactDetails?.contactPerson && <p className="text-sm text-muted-foreground">Contact: {partyLedger.contactDetails.contactPerson}</p>}
                            {partyLedger?.contactDetails?.email && <p className="text-sm text-muted-foreground">{partyLedger.contactDetails.email}</p>}
                            {partyLedger?.contactDetails?.mobileNumber && <p className="text-sm text-muted-foreground">{partyLedger.contactDetails.mobileNumber}</p>}
                        </div>
                    </div>
                </div>
            )}

            {!isInvoiceType && voucher.partyLedgerId && (
                <div className={`p-4 bg-muted/30 rounded-lg ${!printConfig.companyPartyInfo ? 'print:hidden' : ''}`} data-section="companyPartyInfo">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Party</p>
                    <p className="font-semibold text-lg">{partyLedgerName}</p>
                </div>
            )}

            {isInvoiceType && voucher.invoiceDetails && (
                <div className={`flex flex-wrap gap-4 text-sm ${!printConfig.invoiceMeta ? 'print:hidden' : ''}`} data-section="invoiceMeta">
                    {voucher.invoiceDetails.placeOfSupply && (
                        <div className="px-3 py-1.5 bg-secondary rounded-md"><span className="text-muted-foreground">Place of Supply: </span><span className="font-medium">{voucher.invoiceDetails.placeOfSupply}</span></div>
                    )}
                    {voucher.invoiceDetails.isReverseCharge && (
                        <div className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-md font-medium">Reverse Charge Applicable</div>
                    )}
                    {voucher.invoiceDetails.eInvoiceRef && (
                        <div className="px-3 py-1.5 bg-secondary rounded-md"><span className="text-muted-foreground">e-Invoice: </span><span className="font-medium">{voucher.invoiceDetails.eInvoiceRef}</span></div>
                    )}
                    {voucher.invoiceDetails.eWayBillNo && (
                        <div className="px-3 py-1.5 bg-secondary rounded-md"><span className="text-muted-foreground">e-Way Bill: </span><span className="font-medium">{voucher.invoiceDetails.eWayBillNo}</span></div>
                    )}
                </div>
            )}

            {isInvoiceType && voucher.invoiceDetails?.items && (
                <>
                <div className={`overflow-x-auto ${!printConfig.itemsTable ? 'print:hidden' : ''}`} data-section="itemsTable">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Item / Service</TableHead>
                                <TableHead>HSN/SAC</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Disc%</TableHead>
                                <TableHead className="text-right">Taxable</TableHead>
                                <TableHead className="text-right">GST%</TableHead>
                                {calculations && calculations.totalCgst > 0 && <TableHead className="text-right">CGST</TableHead>}
                                {calculations && calculations.totalSgst > 0 && <TableHead className="text-right">SGST</TableHead>}
                                {calculations && calculations.totalIgst > 0 && <TableHead className="text-right">IGST</TableHead>}
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {voucher.invoiceDetails.items.map((item: InvoiceItem, index: number) => (
                                <TableRow key={index}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                        <p className="font-medium">{item.name}</p>
                                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.hsnCode || item.sacCode || '-'}</TableCell>
                                    <TableCell className="text-right whitespace-nowrap">{item.quantity} {item.uqc}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.rate)}</TableCell>
                                    <TableCell className="text-right">{item.discount || 0}%</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                    <TableCell className="text-right">{item.gstRate}%</TableCell>
                                    {calculations && calculations.totalCgst > 0 && <TableCell className="text-right font-mono">{formatCurrency(item.cgst)}</TableCell>}
                                    {calculations && calculations.totalSgst > 0 && <TableCell className="text-right font-mono">{formatCurrency(item.sgst)}</TableCell>}
                                    {calculations && calculations.totalIgst > 0 && <TableCell className="text-right font-mono">{formatCurrency(item.igst)}</TableCell>}
                                    <TableCell className="text-right font-mono font-medium">{formatCurrency(item.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                </div>
                <div className={!printConfig.taxSummary ? 'print:hidden' : ''} data-section="taxSummary">
                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatCurrency(voucher.invoiceDetails.subtotal + (voucher.invoiceDetails.totalDiscount || 0))}</span></div>
                            {(voucher.invoiceDetails.totalDiscount || 0) > 0 && (
                                <div className="flex justify-between text-red-600"><span>Discount</span><span className="font-mono">-{formatCurrency(voucher.invoiceDetails.totalDiscount)}</span></div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-medium"><span>Taxable Value</span><span className="font-mono">{formatCurrency(voucher.invoiceDetails.subtotal)}</span></div>
                            {calculations && calculations.totalCgst > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>CGST</span><span className="font-mono">{formatCurrency(calculations.totalCgst)}</span></div>
                            )}
                            {calculations && calculations.totalSgst > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>SGST</span><span className="font-mono">{formatCurrency(calculations.totalSgst)}</span></div>
                            )}
                            {calculations && calculations.totalIgst > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>IGST</span><span className="font-mono">{formatCurrency(calculations.totalIgst)}</span></div>
                            )}
                            {(voucher.invoiceDetails.tcsAmount || 0) > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>TCS</span><span className="font-mono">{formatCurrency(voucher.invoiceDetails.tcsAmount!)}</span></div>
                            )}
                            {(voucher.invoiceDetails.adjustment || 0) !== 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Adjustment</span><span className="font-mono">{voucher.invoiceDetails.adjustment! > 0 ? '+' : ''}{formatCurrency(voucher.invoiceDetails.adjustment!)}</span></div>
                            )}
                            {(voucher.invoiceDetails.roundOff || 0) !== 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Round Off</span><span className="font-mono">{(voucher.invoiceDetails.roundOff || 0).toFixed(2)}</span></div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span className="font-mono">{formatCurrency(voucher.invoiceDetails.grandTotal)}</span></div>
                            {printConfig.amountInWords && <p className="text-xs text-muted-foreground italic pt-1">{toWords(voucher.invoiceDetails.grandTotal)}</p>}
                        </div>
                    </div>
                </div>
                </>
            )}

            {!isInvoiceType && (
                <>
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
                                    <TableCell className="font-medium">{ledgerMap.get(entry.ledgerId)?.ledgerName || entry.ledgerId}</TableCell>
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
                </>
            )}

            {isInvoiceType && voucher.partyLedgerId && voucher.status !== 'Paid' && (() => {
                const outstanding = voucher.outstandingAmount ?? voucher.invoiceDetails?.grandTotal ?? voucher.totalDebit;
                return outstanding > 0 ? (
                    <div className={`flex items-center justify-between p-4 rounded-lg border-2 border-amber-200 bg-amber-50 ${!printConfig.outstanding ? 'print:hidden' : ''}`} data-section="outstanding">
                        <div>
                            <p className="text-sm font-medium text-amber-800">Outstanding Amount</p>
                            <p className="text-2xl font-bold text-amber-900">{formatCurrency(outstanding)}</p>
                        </div>
                        <Button onClick={openPaymentDialog} className="print:hidden">
                            {isSaleType ? <Banknote className="mr-2 h-4 w-4" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            {paymentLabel}
                        </Button>
                    </div>
                ) : null;
            })()}

            {voucher.outstandingAmount === 0 && voucher.status === 'Paid' && isInvoiceType && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Fully Paid</p>
                </div>
            )}

            {voucher.narration && (
                <div className={!printConfig.narration ? 'print:hidden' : ''} data-section="narration">
                    <p className="text-sm font-medium text-muted-foreground">Narration</p>
                    <p className="mt-1 p-3 bg-secondary rounded-md text-sm">{voucher.narration}</p>
                </div>
            )}

            {voucher.invoiceDetails?.remarks && voucher.invoiceDetails.remarks !== voucher.narration && (
                <div className={!printConfig.remarks ? 'print:hidden' : ''} data-section="remarks">
                    <p className="text-sm font-medium text-muted-foreground">Remarks / Terms</p>
                    <p className="mt-1 p-3 bg-secondary rounded-md text-sm whitespace-pre-wrap">{voucher.invoiceDetails.remarks}</p>
                </div>
            )}

            {isInvoiceType && company.bankDetails && (company.bankDetails.accountNumber || company.bankDetails.ifscCode) && (
                <div className="p-4 bg-muted/30 rounded-lg" data-section="bankDetails">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bank Details for Payment</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        {company.bankDetails.bankName && <><span className="text-muted-foreground">Bank</span><span className="font-medium">{company.bankDetails.bankName}</span></>}
                        {company.bankDetails.branchName && <><span className="text-muted-foreground">Branch</span><span className="font-medium">{company.bankDetails.branchName}</span></>}
                        {company.bankDetails.accountHolderName && <><span className="text-muted-foreground">A/C Holder</span><span className="font-medium">{company.bankDetails.accountHolderName}</span></>}
                        {company.bankDetails.accountNumber && <><span className="text-muted-foreground">A/C Number</span><span className="font-medium font-mono">{company.bankDetails.accountNumber}</span></>}
                        {company.bankDetails.ifscCode && <><span className="text-muted-foreground">IFSC</span><span className="font-medium font-mono">{company.bankDetails.ifscCode}</span></>}
                    </div>
                </div>
            )}

            {isInvoiceType && (
                <div className={`grid gap-4 ${!printConfig.accountingEntries ? 'print:hidden' : ''}`} data-section="accountingEntries">
                    <p className="text-sm font-medium text-muted-foreground">Accounting Entries</p>
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
                                    <TableCell className="font-medium">{ledgerMap.get(entry.ledgerId)?.ledgerName || entry.ledgerId}</TableCell>
                                    <TableCell className="text-right font-mono">{entry.type === 'Dr' ? formatCurrency(entry.amount) : ''}</TableCell>
                                    <TableCell className="text-right font-mono">{entry.type === 'Cr' ? formatCurrency(entry.amount) : ''}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {linkedPayments.length > 0 && (
                <div className={`space-y-3 ${!printConfig.paymentHistory ? 'print:hidden' : ''}`} data-section="paymentHistory">
                    <p className="text-sm font-medium text-muted-foreground">{isSaleType ? 'Receipt History' : 'Payment History'}</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Voucher No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {linkedPayments.map((pv, i) => {
                                const pvDate = pv.date instanceof Date ? pv.date : (pv.date as any)?.toDate?.() || new Date();
                                const allocation = pv.billAllocations?.find(b => b.voucherId === voucherId);
                                return (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{pv.voucherNumber}</TableCell>
                                        <TableCell>{format(pvDate, 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{pv.paymentMode || '-'}</TableCell>
                                        <TableCell>{pv.referenceNumber || '-'}</TableCell>
                                        <TableCell className="text-right font-mono font-medium text-green-700">{formatCurrency(allocation?.amount || pv.totalDebit)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-4 text-xs text-muted-foreground text-center justify-center print:hidden">
            <p>Created on {format(createdAtDate, 'PPpp')}</p>
        </CardFooter>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{paymentLabel}</DialogTitle>
                <DialogDescription>Record a {isSaleType ? 'receipt' : 'payment'} against voucher {voucher.voucherNumber}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="NEFT/RTGS">NEFT / RTGS</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{isSaleType ? 'Received Into' : 'Paid From'} (Bank / Cash Ledger)</Label>
                    <Select value={paymentLedgerId} onValueChange={setPaymentLedgerId}>
                        <SelectTrigger><SelectValue placeholder="Select ledger" /></SelectTrigger>
                        <SelectContent>
                            {bankCashLedgers.map(l => (
                                <SelectItem key={l.id} value={l.id}>{l.ledgerName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Reference / Transaction No.</Label>
                    <Input placeholder="e.g., UTR, Cheque No." value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Narration</Label>
                    <Textarea value={paymentNarration} onChange={(e) => setPaymentNarration(e.target.value)} />
                </div>
            </div>
            <DialogFooter className="border-t pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handlePaymentSubmit} disabled={isSubmittingPayment || !paymentLedgerId || paymentAmount <= 0}>
                    {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaleType ? 'Record Receipt' : 'Record Payment'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Configure Print / Export</DialogTitle>
                <DialogDescription>Choose which sections appear when printing or exporting this voucher.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
                {[
                    { key: 'companyPartyInfo' as const, label: 'Company & Party Info' },
                    { key: 'invoiceMeta' as const, label: 'Invoice Meta (Place of Supply, e-Invoice, etc.)' },
                    { key: 'itemsTable' as const, label: 'Items Table' },
                    { key: 'taxSummary' as const, label: 'Tax Summary & Totals' },
                    { key: 'amountInWords' as const, label: 'Amount in Words' },
                    { key: 'outstanding' as const, label: 'Outstanding Amount' },
                    { key: 'narration' as const, label: 'Narration' },
                    { key: 'remarks' as const, label: 'Remarks / Terms' },
                    { key: 'accountingEntries' as const, label: 'Accounting Entries' },
                    { key: 'paymentHistory' as const, label: 'Payment History' },
                ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-3">
                        <Checkbox
                            id={`config-${key}`}
                            checked={printConfig[key]}
                            onCheckedChange={() => toggleConfig(key)}
                        />
                        <Label htmlFor={`config-${key}`} className="text-sm font-normal cursor-pointer">{label}</Label>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Done</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
