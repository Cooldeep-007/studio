'use server';
/**
 * @fileOverview A Genkit flow for generating a JSON schema for custom fields based on a natural language description.
 *
 * - generateCustomFieldSchema - A function that handles the generation of the JSON schema.
 * - GenerateCustomFieldSchemaInput - The input type for the generateCustomFieldSchema function.
 * - GenerateCustomFieldSchemaOutput - The return type for the generateCustomFieldSchema function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomFieldSchemaInputSchema = z.object({
  description: z
    .string()
    .describe(
      'A plain English description of the custom fields needed, including their names, types, and any validation rules (e.g., required, min/max length, format, enum values, default values).'
    ),
});
export type GenerateCustomFieldSchemaInput = z.infer<
  typeof GenerateCustomFieldSchemaInputSchema
>;

const GenerateCustomFieldSchemaOutputSchema = z.object({
  jsonSchema: z
    .string()
    .describe('The generated JSON schema string for the custom fields.'),
});
export type GenerateCustomFieldSchemaOutput = z.infer<
  typeof GenerateCustomFieldSchemaOutputSchema
>;

export async function generateCustomFieldSchema(
  input: GenerateCustomFieldSchemaInput
): Promise<GenerateCustomFieldSchemaOutput> {
  return generateCustomFieldSchemaFlow(input);
}

const generateCustomFieldSchemaPrompt = ai.definePrompt({
  name: 'generateCustomFieldSchemaPrompt',
  input: {schema: GenerateCustomFieldSchemaInputSchema},
  output: {schema: GenerateCustomFieldSchemaOutputSchema},
  prompt: `You are an expert in JSON schema generation.
Your task is to convert a plain English description of custom fields into a valid JSON schema.

The generated JSON schema should:
- Be a valid JSON object string.
- Have 'type: "object"' at the root.
- Infer appropriate data types (e.g., 'string', 'number', 'boolean', 'array', 'object').
- Infer validation rules (e.g., 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'enum', 'format', 'default', 'required') based on the description.
- Include a 'title' and 'description' for the overall schema and for each property.
- Only output the JSON schema string, nothing else.

Here are some examples:

User description: "I need custom fields for an invoice. One for 'Customer Email' which must be a valid email address and is required. Another for 'Purchase Order Number' which is optional and can be a string up to 20 characters. And a 'Delivery Date' which should be a date string. Finally, a 'Payment Status' which can be 'Paid', 'Pending', or 'Overdue' and defaults to 'Pending'."
Generated JSON schema:
{{json
  {
    "type": "object",
    "title": "Invoice Custom Fields",
    "description": "Custom fields for an invoice.",
    "properties": {
      "customerEmail": {
        "type": "string",
        "format": "email",
        "description": "The customer's email address."
      },
      "purchaseOrderNumber": {
        "type": "string",
        "maxLength": 20,
        "description": "The purchase order number, if any."
      },
      "deliveryDate": {
        "type": "string",
        "format": "date",
        "description": "The expected delivery date."
      },
      "paymentStatus": {
        "type": "string",
        "enum": ["Paid", "Pending", "Overdue"],
        "default": "Pending",
        "description": "The payment status of the invoice."
      }
    },
    "required": ["customerEmail"]
  }
}}

User description: "I need a field for 'Product Quantity' which is a required number and must be at least 1. Also, a boolean field named 'Is Discounted'."
Generated JSON schema:
{{json
  {
    "type": "object",
    "title": "Product Fields",
    "description": "Custom fields for product details.",
    "properties": {
      "productQuantity": {
        "type": "number",
        "minimum": 1,
        "description": "The quantity of the product."
      },
      "isDiscounted": {
        "type": "boolean",
        "description": "Indicates if the product is discounted."
      }
    },
    "required": ["productQuantity"]
  }
}}

Now, generate the JSON schema for the following description:
User description: {{{description}}}
Generated JSON schema:
`,
});

const generateCustomFieldSchemaFlow = ai.defineFlow(
  {
    name: 'generateCustomFieldSchemaFlow',
    inputSchema: GenerateCustomFieldSchemaInputSchema,
    outputSchema: GenerateCustomFieldSchemaOutputSchema,
  },
  async (input) => {
    const {output} = await generateCustomFieldSchemaPrompt(input);
    return output!;
  }
);
