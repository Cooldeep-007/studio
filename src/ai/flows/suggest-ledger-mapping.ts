'use server';
/**
 * @fileOverview A Genkit flow for suggesting appropriate ledger accounts for transactions.
 *
 * - suggestLedgerMapping - A function that suggests a ledger account based on transaction description and available ledgers.
 * - SuggestLedgerMappingInput - The input type for the suggestLedgerMapping function.
 * - SuggestLedgerMappingOutput - The return type for the suggestLedgerMapping function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LedgerSchema = z.object({
  id: z.string().describe('Unique identifier for the ledger account.'),
  name: z.string().describe('Name of the ledger account.'),
  group: z.enum(['Assets', 'Liabilities', 'Income', 'Expense']).describe('The group the ledger belongs to.'),
});

const SuggestLedgerMappingInputSchema = z.object({
  transactionDescription: z
    .string()
    .describe('The description of the transaction from bank statements or external imports.'),
  availableLedgers:
    z.array(LedgerSchema)
      .describe('A list of available ledger accounts to choose from.'),
});
export type SuggestLedgerMappingInput = z.infer<typeof SuggestLedgerMappingInputSchema>;

const SuggestLedgerMappingOutputSchema = z.object({
  suggestedLedgerId: z
    .string()
    .nullable()
    .describe('The ID of the most appropriate ledger account from the availableLedgers, or null if no suitable match is found.'),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('A confidence score (0-1) for the suggestion, where 1 is highly confident.'),
  reasoning: z.string().describe('An explanation for why this ledger account was suggested.'),
});
export type SuggestLedgerMappingOutput = z.infer<typeof SuggestLedgerMappingOutputSchema>;

export async function suggestLedgerMapping(
  input: SuggestLedgerMappingInput
): Promise<SuggestLedgerMappingOutput> {
  return suggestLedgerMappingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLedgerMappingPrompt',
  input: { schema: SuggestLedgerMappingInputSchema },
  output: { schema: SuggestLedgerMappingOutputSchema },
  prompt: `You are an expert accounting assistant. Your task is to analyze a transaction description and suggest the most appropriate ledger account from a provided list of available ledgers.

Here is the transaction description:
"{{{transactionDescription}}}"

Here are the available ledger accounts. Each ledger has an ID, a name, and a group:
{{#each availableLedgers}}
- ID: {{this.id}}, Name: {{this.name}}, Group: {{this.group}}
{{/each}}

Please select the single best matching ledger account from the list.
If you cannot find a suitable ledger account from the provided list, set "suggestedLedgerId" to null.
Provide a confidence score (between 0 and 1) for your suggestion, and a clear reasoning for your choice.`,
});

const suggestLedgerMappingFlow = ai.defineFlow(
  {
    name: 'suggestLedgerMappingFlow',
    inputSchema: SuggestLedgerMappingInputSchema,
    outputSchema: SuggestLedgerMappingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
