# Objective
Enhance voucher view page with comprehensive details (company info, buyer/seller, items, GST breakdown) and add instant payment/receipt feature that updates outstanding amounts.

# Tasks

### T001: Enhance Voucher View Page with Full Details
- **Blocked By**: []
- **Details**:
  - File: src/app/(app)/vouchers/[id]/page.tsx
  - Rewrite the Card section (lines ~496-558) to show a professional invoice-style view:
    1. **Company Section**: Company name, GSTIN, address (from `company` object)
    2. **Buyer/Seller Section**: Party ledger name, GSTIN, address, contact details, state (from `ledgerMap.get(voucher.partyLedgerId)` which is a Ledger with `contactDetails`, `gstDetails`)
    3. **Invoice Meta**: Voucher number, date, due date, place of supply, e-Invoice ref, e-Way Bill no
    4. **Items Table** (for Sales/Purchase with invoiceDetails): Show item name, HSN/SAC, qty, UQC, rate, discount, taxable amount, GST rate, CGST, SGST, IGST, total
    5. **Summary Section**: Subtotal, discount, taxable value, CGST/SGST/IGST breakdown, TCS, adjustment, round off, grand total
    6. **Amount in Words**: Use existing `toWords` function
    7. **Payment Status**: Show status badge (Paid/Partial/Unpaid), outstanding amount
    8. **Narration/Remarks**: Show remarks from invoiceDetails
    9. For non-invoice vouchers (Journal, Payment, Receipt, Contra): keep the existing entries table view
  - Keep existing export/print buttons
  - Acceptance: Full professional invoice view for Sales/Purchase vouchers

### T002: Add Instant Payment/Receipt Dialog
- **Blocked By**: [T001]
- **Details**:
  - File: src/app/(app)/vouchers/[id]/page.tsx (add dialog inline or create separate component)
  - Add a "Record Payment" or "Record Receipt" button (based on voucher type: Sales = Receipt, Purchase = Payment)
  - Dialog fields:
    - Amount (default: outstanding amount)
    - Date (default: today)
    - Payment Mode (Cash, NEFT/RTGS, UPI, Cheque, Card)
    - Reference/Transaction Number
    - Bank/Cash ledger selection (from ledgers filtered to Bank Accounts / Cash-in-Hand groups)
    - Narration
  - On submit:
    - Create a new Payment/Receipt voucher in Firestore with proper entries (Dr bank/cash, Cr party for Receipt; Dr party, Cr bank/cash for Payment)
    - Update the original voucher's `outstandingAmount` (reduce by payment amount)
    - Update the original voucher's `status` (if outstanding = 0 → 'Paid', if outstanding > 0 → 'Partial')
    - Add `billAllocations` to the new payment/receipt voucher linking it to the original
  - Show payment history section on the voucher view (list of linked payments/receipts)
  - Acceptance: User can record payment, outstanding updates, status changes
