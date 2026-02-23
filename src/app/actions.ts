
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
  xmlContent: z.string().min(1, "XML file is empty or could not be read."),
  companyId: z.string().min(1, "Company is required."),
  firmId: z.string().min(1, "Firm could not be identified."),
  importMode: z.enum(['create', 'update', 'skip']),
  dryRun: z.boolean(),
});

type TallyLedger = {
  '@_NAME': string;
  PARENT?: string; // Parent can be optional for top-level groups
  OPENINGBALANCE?: number | string;
  ISDEEMEDPOSITIVE?: 'Yes' | 'No';
  GSTCLASSIFICATIONNAME?: string;
  LEDGERCONTACT?: string;
  LEDGERPHONE?: string;
  LEDGEREMAIL?: string;
  GSTREGISTRATIONTYPE?: 'Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'Unknown';
  PARTYGSTIN?: string;
  ADDRESS?: { V: string[] };
  STATENAME?: string;
  PINCODE?: string;
  INCOMETAXNUMBER?: string;
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


export async function handleTallyImport(prevState: TallyImportState, formData: FormData): Promise<TallyImportState> {
    const rawData = {
        xmlContent: formData.get('xmlContent'),
        companyId: formData.get('companyId'),
        firmId: formData.get('firmId'),
        importMode: formData.get('importMode'),
        dryRun: formData.get('dryRun') === 'true',
    }

    const validatedFields = tallyImportSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return { message: "Form validation failed.", error: JSON.stringify(validatedFields.error.flatten().fieldErrors) };
    }

    const { xmlContent, companyId, firmId, importMode, dryRun } = validatedFields.data;
    
    try {
        const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true, trimValues: true });
        const jsonObj = parser.parse(xmlContent);

        const tallyLedgerNode = jsonObj?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE?.LEDGER;
        const ledgers: TallyLedger[] = Array.isArray(tallyLedgerNode) ? tallyLedgerNode : tallyLedgerNode ? [tallyLedgerNode] : [];

        if (ledgers.length === 0) {
            return { message: "No ledgers found in the XML file or invalid Tally XML format." };
        }
        
        // --- PRE-FETCH EXISTING DATA ---
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

        // --- PROCESS & PREPARE DATA ---
        const previewResult: TallyPreviewLedger[] = [];
        const ledgersToCreate: Ledger[] = [];
        const ledgersToUpdate: { id: string, data: Partial<Ledger> }[] = [];
        let skippedCount = 0;

        for (const tallyLedger of ledgers) {
            const ledgerName = tallyLedger['@_NAME'];
            
            if (!ledgerName) {
              continue; // Skip ledgers without a name
            }

            const parentName = tallyLedger.PARENT;
            
            let openingBalance: number;
            const rawOpeningBalance = tallyLedger.OPENINGBALANCE;

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
            if (tallyLedger.ISDEEMEDPOSITIVE === 'No' || (typeof rawOpeningBalance === 'string' && rawOpeningBalance.includes('Cr'))) {
                balanceType = 'Cr';
            }

            openingBalance = Math.abs(openingBalance);
            
            let classification: TallyPreviewLedger['gstClassification'];
            if (tallyLedger.GSTCLASSIFICATIONNAME?.toLowerCase().includes('goods')) classification = 'Goods';
            if (tallyLedger.GSTCLASSIFICATIONNAME?.toLowerCase().includes('service')) classification = 'Services';
            
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
            
            const ledgerData: Omit<Ledger, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
                ledgerName,
                parentLedgerId: parentInfo.id,
                group: parentInfo.group,
                openingBalance,
                currentBalance: openingBalance,
                balanceType,
                isGroup: false,
                gstApplicable: !!tallyLedger.PARTYGSTIN,
                status: 'Active',
                firmId,
                companyId,
                contactDetails: {
                    addressLine1: Array.isArray(tallyLedger.ADDRESS?.V) ? tallyLedger.ADDRESS.V.join(', ') : undefined,
                    state: tallyLedger.STATENAME,
                    pincode: tallyLedger.PINCODE,
                    pan: tallyLedger.INCOMETAXNUMBER,
                    email: tallyLedger.LEDGEREMAIL,
                    mobileNumber: tallyLedger.LEDGERPHONE,
                },
                gstDetails: {
                    gstin: tallyLedger.PARTYGSTIN,
                    gstRate: 0, // Tally master does not export rate
                    gstClassification: classification,
                    gstType: tallyLedger.GSTREGISTRATIONTYPE
                }
            };
            
            if (status === 'New') ledgersToCreate.push(ledgerData as Ledger);
            if (status === 'Update' && existing) ledgersToUpdate.push({ id: existing.id, data: ledgerData });

            previewResult.push({ ledgerName, parent: parentName, openingBalance, balanceType, status, gstin: tallyLedger.PARTYGSTIN, gstClassification: classification });
        }
        
        if (dryRun) {
            return { message: "Dry run completed successfully. See preview below.", preview: previewResult };
        }

        // --- EXECUTE FIRESTORE WRITES ---
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
                total: ledgers.length,
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                errors: previewResult.filter(p => p.status === 'Error').length
            }
        };

    } catch (e: any) {
        console.error("Tally Import Error:", e);
        return {
            message: "An error occurred during import.",
            error: "Failed to parse XML file. Please ensure it is a valid Tally Ledger Master XML. " + e.message,
        };
    }
}

    