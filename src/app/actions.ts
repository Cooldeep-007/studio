"use server";

import { generateCustomFieldSchema } from "@/ai/flows/generate-custom-field-schema";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";

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
  companyId: z.string(),
  importMode: z.enum(['create', 'update', 'skip']),
  dryRun: z.boolean(),
});

type TallyLedger = {
  '@_NAME': string;
  PARENT: string;
  OPENINGBALANCE: number;
  ISDEEMEDPOSITIVE: 'Yes' | 'No';
  LEDGERCONTACT?: string;
  LEDGERPHONE?: string;
  LEDGEREMAIL?: string;
  GSTREGISTRATIONTYPE?: string;
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
        importMode: formData.get('importMode'),
        dryRun: formData.get('dryRun') === 'true',
    }

    const validatedFields = tallyImportSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return { message: "Form validation failed.", error: validatedFields.error.flatten().fieldErrors.xmlContent?.[0] };
    }

    const { xmlContent, importMode, dryRun } = validatedFields.data;
    
    try {
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonObj = parser.parse(xmlContent);

        const ledgers: TallyLedger[] = jsonObj?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE?.LEDGER || [];

        if (!Array.isArray(ledgers) || ledgers.length === 0) {
            return { message: "No ledgers found in the XML file or invalid Tally XML format." };
        }

        const previewResult: TallyPreviewLedger[] = [];

        // This is a mock of finding existing ledgers. In a real app, this would be a DB query.
        const existingLedgers: any[] = []; // e.g. await db.ledgers.find({ companyId });

        for (const tallyLedger of ledgers) {
            const ledgerName = tallyLedger['@_NAME'];
            const parent = tallyLedger.PARENT;
            const openingBalance = Math.abs(tallyLedger.OPENINGBALANCE || 0);
            const balanceType = tallyLedger.ISDEEMEDPOSITIVE === 'No' ? 'Cr' : 'Dr';

            const existing = existingLedgers.find(l => l.ledgerName.toLowerCase() === ledgerName.toLowerCase());

            let status: TallyPreviewLedger['status'] = 'New';
            if (existing) {
                if (importMode === 'skip') status = 'Duplicate';
                if (importMode === 'update') status = 'Update';
            }
            
            previewResult.push({
                ledgerName,
                parent,
                openingBalance,
                balanceType,
                gstin: tallyLedger.PARTYGSTIN,
                status,
            });
        }
        
        if (dryRun) {
            return {
                message: "Dry run completed successfully. See preview below.",
                preview: previewResult
            };
        }

        // --- SIMULATED IMPORT ---
        // In a real application, here you would perform the bulk write to the database
        // based on the importMode and the 'status' determined above.
        
        let importedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        previewResult.forEach(res => {
            if (res.status === 'New') importedCount++;
            if (res.status === 'Update') updatedCount++;
            if (res.status === 'Duplicate') skippedCount++;
        });

        return {
            message: "Import completed successfully!",
            summary: {
                total: ledgers.length,
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                errors: 0
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
