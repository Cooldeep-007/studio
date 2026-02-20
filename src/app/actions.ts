"use server";

import { generateCustomFieldSchema } from "@/ai/flows/generate-custom-field-schema";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(10, "Please provide a more detailed description."),
});

export type FormState = {
  message: string;
  jsonSchema: string | null;
  errors?: {
    description?: string[];
  } | null;
};

export async function handleGenerateSchema(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = schema.safeParse({
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
