
'use server';

import { generateCustomFieldSchema } from "@/ai/flows/generate-custom-field-schema";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { initializeFirebase } from "@/firebase/server-init";
import { collection, doc, getDocs, writeBatch, serverTimestamp, query } from "firebase/firestore";
import type { Ledger, LedgerGroup } from "@/lib/types";

const { firestore } = initializeFirebase();

// Schema for Custom Field Generator
const customFieldSchema = z.object({
  description: z.string().min(10, "Please provide a more detailed description."),
});

export type CustomFieldFormState = {
  message: string;
  jsonSchema: string | null;
  errors?: {
    description?: string[];
  } | null;
};

export async function handleGenerateSchema(
  prevState: CustomFieldFormState,
  formData: FormData
): Promise<CustomFieldFormState> {
  const validatedFields = customFieldSchema.safeParse({
    description: formData.get("description"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed.",
      jsonSchema: null,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateCustomFieldSchema({
      description: validatedFields.data.description,
    });
    
    // Basic JSON validation
    JSON.parse(result.jsonSchema);

    return {
      message: "Schema generated successfully!",
      jsonSchema: result.jsonSchema,
      errors: null,
    };
  } catch (error) {
    console.error("AI Schema Generation Error:", error);
    return {
      message: "Failed to generate schema. The AI model might be unavailable or returned an invalid format.",
      jsonSchema: null,
      errors: null,
    };
  }
}


// Schemas and Types for Tally Import
const tallyImportSchema = z.object({
  fileContent: z.string().min(1, "File is empty or could not be read."),
  fileType: z.enum(['xml', 'csv']),
  companyId: z.string().min(1, "Company is required."),
  firmId: z.string().min(1, "Firm could not be identified."),
  importMode: z.enum(['create', 'update', 'skip']),
  dryRun: z.boolean(),
});

type TallyLedger = {
  '@_NAME': string | string[];
  PARENT?: string | string[];
  OPENINGBALANCE?: number | string | (number | string)[];
  ISDEEMEDPOSITIVE?: 'Yes' | 'No' | ('Yes' | 'No')[];
  GSTCLASSIFICATIONNAME?: string | string[];
  LEDGERCONTACT?: string | string[];
  LEDGERPHONE?: string | string[];
  LEDGEREMAIL?: string | string[];
  GSTREGISTRATIONTYPE?: ('Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'Unknown') | ('Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'Unknown')[];
  PARTYGSTIN?: string | string[];
  ADDRESS?: { V: string[] } | { V: string[] }[];
  STATENAME?: string | string[];
  PINCODE?: string | string[];
  INCOMETAXNUMBER?: string | string[];
};

export type TallyPreviewLedger = {
    ledgerName: string;
    parent: string;
    openingBalance: number;
    balanceType: 'Dr' | 'Cr';
    gstin?: string;
    gstClassification?: 'Goods' | 'Services';
    status: 'New' | 'Duplicate' | 'Update' | 'Error';
    error?: string;
}

export type TallyImportState = {
    message: string;
    summary?: {
        total: number;
        imported: number;
        updated: number;
        skipped: number;
        errors: number;
    } | null;
    preview?: TallyPreviewLedger[] | null;
    error?: string | null;
}


function parseCSVContent(csvContent: string): Record<string, string>[] {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { result.push(current.trim()); current = ''; }
                else { current += ch; }
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    return rows;
}

function csvRowToLedgerData(row: Record<string, string>): {
    ledgerName: string;
    parentName: string;
    openingBalance: number;
    balanceType: 'Dr' | 'Cr';
    gstApplicable: boolean;
    gstin?: string;
    gstType?: string;
    gstClassification?: 'Goods' | 'Services';
    gstRate?: number;
    hsnCode?: string;
    contactPerson?: string;
    mobileNumber?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    pan?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
    creditLimit?: number;
    creditPeriod?: number;
} {
    const bal = parseFloat(row['Opening Balance'] || '0');
    const gstApplicableRaw = (row['GST Applicable'] || '').toLowerCase();
    return {
        ledgerName: row['Ledger Name'] || '',
        parentName: row['Parent Group'] || '',
        openingBalance: isNaN(bal) ? 0 : Math.abs(bal),
        balanceType: (row['Balance Type'] === 'Cr' ? 'Cr' : 'Dr') as 'Dr' | 'Cr',
        gstApplicable: gstApplicableRaw === 'yes' || gstApplicableRaw === 'true',
        gstin: row['GSTIN'] || undefined,
        gstType: row['GST Registration Type'] || undefined,
        gstClassification: row['GST Classification'] === 'Goods' ? 'Goods' : row['GST Classification'] === 'Services' ? 'Services' : undefined,
        gstRate: row['GST Rate'] ? parseFloat(row['GST Rate']) : undefined,
        hsnCode: row['HSN/SAC Code'] || undefined,
        contactPerson: row['Contact Person'] || undefined,
        mobileNumber: row['Mobile Number'] || undefined,
        email: row['Email'] || undefined,
        addressLine1: row['Address Line 1'] || undefined,
        addressLine2: row['Address Line 2'] || undefined,
        city: row['City'] || undefined,
        state: row['State'] || undefined,
        pincode: row['Pincode'] || undefined,
        country: row['Country'] || undefined,
        pan: row['PAN'] || undefined,
        bankName: row['Bank Name'] || undefined,
        accountNumber: row['Account Number'] || undefined,
        ifscCode: row['IFSC Code'] || undefined,
        accountType: row['Account Type'] || undefined,
        creditLimit: row['Credit Limit'] ? parseFloat(row['Credit Limit']) : undefined,
        creditPeriod: row['Credit Period (Days)'] ? parseInt(row['Credit Period (Days)']) : undefined,
    };
}

export async function handleTallyImport(prevState: TallyImportState, formData: FormData): Promise<TallyImportState> {
    const fileContent = formData.get('fileContent') as string || formData.get('xmlContent') as string;
    const fileType = formData.get('fileType') as string || 'xml';

    const rawData = {
        fileContent,
        fileType,
        companyId: formData.get('companyId'),
        firmId: formData.get('firmId'),
        importMode: formData.get('importMode'),
        dryRun: formData.get('dryRun') === 'true',
    }

    const validatedFields = tallyImportSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return { message: "Form validation failed.", error: JSON.stringify(validatedFields.error.flatten().fieldErrors), preview: null, summary: null };
    }

    const { fileContent: content, fileType: type, companyId, firmId, importMode, dryRun } = validatedFields.data;
    
    try {
        const ledgersCollectionRef = collection(firestore, 'firms', firmId, 'companies', companyId, 'ledgers');
        const existingLedgersSnapshot = await getDocs(query(ledgersCollectionRef));
        
        const existingLedgersMap = new Map<string, Ledger>();
        const parentLedgerMap = new Map<string, { id: string, group: LedgerGroup }>();

        existingLedgersSnapshot.forEach(doc => {
            const ledger = { id: doc.id, ...doc.data() } as Ledger;
            existingLedgersMap.set(ledger.ledgerName.toLowerCase().trim(), ledger);
            if (ledger.isGroup) {
                parentLedgerMap.set(ledger.ledgerName.toLowerCase().trim(), { id: ledger.id, group: ledger.group });
            }
        });

        const previewResult: TallyPreviewLedger[] = [];
        const ledgersToCreate: Ledger[] = [];
        const ledgersToUpdate: { id: string, data: Partial<Ledger> }[] = [];
        let skippedCount = 0;
        let totalRecords = 0;

        if (type === 'csv') {
            const csvRows = parseCSVContent(content);
            totalRecords = csvRows.length;

            if (csvRows.length === 0) {
                return { message: "No data rows found in the CSV file.", error: "CSV file appears to be empty or has only headers.", preview: null, summary: null };
            }

            for (const row of csvRows) {
                const parsed = csvRowToLedgerData(row);

                if (!parsed.ledgerName) continue;

                if (!parsed.parentName) {
                    previewResult.push({
                        ledgerName: parsed.ledgerName, parent: 'N/A', openingBalance: parsed.openingBalance, balanceType: parsed.balanceType, status: 'Error', error: 'Parent Group is missing.'
                    });
                    continue;
                }

                const parentInfo = parentLedgerMap.get(parsed.parentName.toLowerCase().trim());

                if (!parentInfo) {
                    previewResult.push({
                        ledgerName: parsed.ledgerName, parent: parsed.parentName, openingBalance: parsed.openingBalance, balanceType: parsed.balanceType, status: 'Error', error: `Parent group "${parsed.parentName}" not found in this company. Create it first.`
                    });
                    continue;
                }

                const existing = existingLedgersMap.get(parsed.ledgerName.toLowerCase().trim());
                let status: TallyPreviewLedger['status'] = 'New';
                if (existing) {
                    if (importMode === 'skip') { status = 'Duplicate'; skippedCount++; }
                    if (importMode === 'update') { status = 'Update'; }
                }

                const removeUndefinedValues = (obj: any): any => {
                    if (obj === null || obj === undefined) return undefined;
                    if (typeof obj !== 'object') return obj;
                    const cleaned: any = {};
                    let hasValues = false;
                    for (const [key, value] of Object.entries(obj)) {
                        if (value !== undefined && value !== '') {
                            cleaned[key] = value;
                            hasValues = true;
                        }
                    }
                    return hasValues ? cleaned : undefined;
                };

                const contactDetails = removeUndefinedValues({
                    contactPerson: parsed.contactPerson,
                    mobileNumber: parsed.mobileNumber,
                    email: parsed.email,
                    addressLine1: parsed.addressLine1,
                    addressLine2: parsed.addressLine2,
                    city: parsed.city,
                    state: parsed.state,
                    pincode: parsed.pincode,
                    country: parsed.country,
                    pan: parsed.pan,
                });

                const bankDetails = removeUndefinedValues({
                    bankName: parsed.bankName,
                    accountNumber: parsed.accountNumber,
                    ifscCode: parsed.ifscCode,
                    accountType: parsed.accountType,
                });

                const gstDetails = parsed.gstApplicable ? removeUndefinedValues({
                    gstin: parsed.gstin,
                    gstType: parsed.gstType,
                    gstClassification: parsed.gstClassification,
                    gstRate: parsed.gstRate,
                    hsnCode: parsed.hsnCode,
                }) : undefined;

                const creditControl = removeUndefinedValues({
                    creditLimit: parsed.creditLimit,
                    creditPeriod: parsed.creditPeriod,
                });

                const ledgerData: any = {
                    ledgerName: parsed.ledgerName,
                    parentLedgerId: parentInfo.id,
                    group: parentInfo.group,
                    openingBalance: parsed.openingBalance,
                    currentBalance: parsed.openingBalance,
                    balanceType: parsed.balanceType,
                    isGroup: false,
                    gstApplicable: parsed.gstApplicable,
                    status: 'Active',
                    firmId,
                    companyId,
                };
                if (contactDetails) ledgerData.contactDetails = contactDetails;
                if (bankDetails) ledgerData.bankDetails = bankDetails;
                if (gstDetails) ledgerData.gstDetails = gstDetails;
                if (creditControl) ledgerData.creditControl = creditControl;

                if (status === 'New') ledgersToCreate.push(ledgerData as Ledger);
                if (status === 'Update' && existing) ledgersToUpdate.push({ id: existing.id, data: ledgerData });

                previewResult.push({ ledgerName: parsed.ledgerName, parent: parsed.parentName, openingBalance: parsed.openingBalance, balanceType: parsed.balanceType, status, gstin: parsed.gstin, gstClassification: parsed.gstClassification });
            }

        } else {
            const parser = new XMLParser({
                ignoreAttributes: false,
                parseAttributeValue: true,
                trimValues: true,
                isArray: (tagName) => ['TALLYMESSAGE', 'LEDGER'].includes(tagName),
            });
            const jsonObj = parser.parse(content);

            const tallyMessages = jsonObj?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE;

            if (!tallyMessages || !Array.isArray(tallyMessages) || tallyMessages.length === 0) {
                return { message: "No valid TALLYMESSAGE data found in the XML file.", error: "Could not find TALLYMESSAGE array in XML.", preview: null, summary: null };
            }

            const ledgers: TallyLedger[] = tallyMessages.flatMap((msg: any) => (msg.LEDGER ? (Array.isArray(msg.LEDGER) ? msg.LEDGER : [msg.LEDGER]) : []));

            if (ledgers.length === 0) {
                return { message: "No ledgers found in the imported Tally file.", preview: null, summary: null };
            }
            
            totalRecords = ledgers.length;
            const getFirstValue = (value: any): any => Array.isArray(value) ? value[0] : value;

            for (const tallyLedger of ledgers) {
                const ledgerName = getFirstValue(tallyLedger['@_NAME']);
                
                if (!ledgerName) continue;

                const parentName = getFirstValue(tallyLedger.PARENT);
                
                let openingBalance: number;
                const rawOpeningBalance = getFirstValue(tallyLedger.OPENINGBALANCE);

                if (typeof rawOpeningBalance === 'number') {
                    openingBalance = rawOpeningBalance;
                } else if (typeof rawOpeningBalance === 'string' && rawOpeningBalance.trim() !== '') {
                    openingBalance = parseFloat(rawOpeningBalance.replace(/ Cr$/, '').replace(/ Dr$/, ''));
                } else {
                    openingBalance = 0;
                }

                if (isNaN(openingBalance)) {
                    openingBalance = 0;
                }
                
                let balanceType: 'Dr' | 'Cr' = 'Dr';
                const isDeemedPositive = getFirstValue(tallyLedger.ISDEEMEDPOSITIVE);
                if (isDeemedPositive === 'No' || (typeof rawOpeningBalance === 'string' && rawOpeningBalance.includes('Cr'))) {
                    balanceType = 'Cr';
                }

                openingBalance = Math.abs(openingBalance);
                
                let classification: TallyPreviewLedger['gstClassification'];
                const gstClassificationName = getFirstValue(tallyLedger.GSTCLASSIFICATIONNAME);
                if (gstClassificationName?.toLowerCase().includes('goods')) classification = 'Goods';
                if (gstClassificationName?.toLowerCase().includes('service')) classification = 'Services';
                
                if (!parentName) {
                    previewResult.push({
                        ledgerName, parent: 'N/A', openingBalance, balanceType, status: 'Error', error: 'Parent group is missing in Tally XML.'
                    });
                    continue;
                }

                const parentInfo = parentLedgerMap.get(parentName.toLowerCase().trim());

                if (!parentInfo) {
                    previewResult.push({
                        ledgerName, parent: parentName, openingBalance, balanceType, status: 'Error', error: 'Parent group not found in this company.'
                    });
                    continue;
                }

                const existing = existingLedgersMap.get(ledgerName.toLowerCase().trim());
                let status: TallyPreviewLedger['status'] = 'New';
                if (existing) {
                    if (importMode === 'skip') { status = 'Duplicate'; skippedCount++; }
                    if (importMode === 'update') { status = 'Update'; }
                }
                
                const gstin = getFirstValue(tallyLedger.PARTYGSTIN);
                const addressObj = getFirstValue(tallyLedger.ADDRESS);
                const address = addressObj?.V ? (Array.isArray(addressObj.V) ? addressObj.V.join(', ') : addressObj.V) : undefined;
                
                const ledgerData: Omit<Ledger, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
                    ledgerName,
                    parentLedgerId: parentInfo.id,
                    group: parentInfo.group,
                    openingBalance,
                    currentBalance: openingBalance,
                    balanceType,
                    isGroup: false,
                    gstApplicable: !!gstin,
                    status: 'Active',
                    firmId,
                    companyId,
                    contactDetails: {
                        addressLine1: address,
                        state: getFirstValue(tallyLedger.STATENAME),
                        pincode: getFirstValue(tallyLedger.PINCODE),
                        pan: getFirstValue(tallyLedger.INCOMETAXNUMBER),
                        email: getFirstValue(tallyLedger.LEDGEREMAIL),
                        mobileNumber: getFirstValue(tallyLedger.LEDGERPHONE),
                    },
                    gstDetails: {
                        gstin: gstin,
                        gstRate: 0,
                        gstClassification: classification,
                        gstType: getFirstValue(tallyLedger.GSTREGISTRATIONTYPE)
                    }
                };
                
                if (status === 'New') ledgersToCreate.push(ledgerData as Ledger);
                if (status === 'Update' && existing) ledgersToUpdate.push({ id: existing.id, data: ledgerData });

                previewResult.push({ ledgerName, parent: parentName, openingBalance, balanceType, status, gstin: gstin, gstClassification: classification });
            }
        }

        if (dryRun) {
            return { message: "Dry run completed successfully. See preview below.", preview: previewResult, summary: null, error: null };
        }

        const BATCH_SIZE = 400;
        let importedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < ledgersToCreate.length; i += BATCH_SIZE) {
            const batch = writeBatch(firestore);
            const chunk = ledgersToCreate.slice(i, i + BATCH_SIZE);
            chunk.forEach(ledger => {
                const newLedgerRef = doc(ledgersCollectionRef);
                batch.set(newLedgerRef, { ...ledger, id: newLedgerRef.id, createdAt: serverTimestamp(), lastUpdatedAt: serverTimestamp() });
            });
            await batch.commit();
            importedCount += chunk.length;
        }
        
        for (let i = 0; i < ledgersToUpdate.length; i += BATCH_SIZE) {
            const batch = writeBatch(firestore);
            const chunk = ledgersToUpdate.slice(i, i + BATCH_SIZE);
            chunk.forEach(item => {
                const docRef = doc(ledgersCollectionRef, item.id);
                batch.update(docRef, { ...item.data, lastUpdatedAt: serverTimestamp() });
            });
            await batch.commit();
            updatedCount += chunk.length;
        }

        return {
            message: "Import completed successfully!",
            summary: {
                total: totalRecords,
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                errors: previewResult.filter(p => p.status === 'Error').length
            },
            preview: null,
            error: null,
        };

    } catch (e: any) {
        console.error("Import Error:", e);
        return {
            message: "An error occurred during import.",
            summary: null,
            preview: null,
            error: `Failed to parse ${type === 'csv' ? 'CSV' : 'XML'} file. ${e.message}`,
        };
    }
}
