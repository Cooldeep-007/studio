import { mockInvoices } from "@/lib/data";
import { mockCompanies } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Send } from "lucide-react";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = mockInvoices.find(inv => inv.id === params.id);
  const company = mockCompanies.find(c => c.id === invoice?.companyId);

  if (!invoice || !company) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <h1 className="text-2xl font-bold">Invoice not found</h1>
          <p className="text-muted-foreground">The requested invoice could not be located.</p>
        </CardContent>
      </Card>
    )
  }

  const themeColor = invoice.template.colorTheme || '#50C878';

  return (
    <div className="max-w-4xl mx-auto">
        <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline"><Send className="mr-2 h-4 w-4" /> Send</Button>
            <Button><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
        </div>
        <Card className="overflow-hidden">
            <div className="p-8 md:p-12">
                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-md" style={{ backgroundColor: themeColor }}>
                                <svg
                                className="h-8 w-8 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                >
                                <path
                                    d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">{company.companyName}</h2>
                        </div>
                        <p className="text-muted-foreground text-sm">{company.address}</p>
                        <p className="text-muted-foreground text-sm">GSTIN: {company.gstin}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold tracking-tight" style={{color: themeColor}}>INVOICE</h1>
                        <p className="text-muted-foreground mt-1"># {invoice.invoiceNumber}</p>
                    </div>
                </div>

                <Separator className="my-8" />

                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="font-semibold mb-2">Bill To</h3>
                        <p className="font-medium">{invoice.party.name}</p>
                        <p className="text-muted-foreground text-sm">{invoice.party.address}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-semibold">Invoice Date:</span> {invoice.date.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Due Date:</span> {invoice.dueDate.toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Tax</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.lineItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell className="text-right">{item.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{item.taxAmount?.toFixed(2)} ({item.taxRate}%)</TableCell>
                                    <TableCell className="text-right">{item.total.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                                <TableCell className="text-right font-semibold">{invoice.subTotal.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-semibold">Total Tax</TableCell>
                                <TableCell className="text-right font-semibold">{invoice.totalTax.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow className="text-lg">
                                <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold">{invoice.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <Separator className="my-8" />

                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <p className="text-muted-foreground text-sm">{invoice.template.footerNotes}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Bank Details</h3>
                        <p className="text-muted-foreground text-sm">{invoice.template.bankDetails}</p>
                    </div>
                </div>
            </div>
        </Card>
    </div>
  )
}
