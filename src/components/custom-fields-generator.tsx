"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { handleGenerateSchema, type CustomFieldFormState } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

const initialState: CustomFieldFormState = {
  message: "",
  jsonSchema: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Sparkles className="mr-2 h-4 w-4" />
      {pending ? "Generating..." : "Generate Schema"}
    </Button>
  );
}

export function CustomFieldsGenerator() {
  const [state, setState] = useState(initialState);

  const clientAction = async (formData: FormData) => {
    const result = await handleGenerateSchema(state, formData);
    setState(result);
  };

  return (
    <form action={clientAction}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Describe Your Custom Fields</CardTitle>
            <CardDescription>
              Use plain English to describe the fields you need for your invoices or ledgers. Be as specific as possible about names, types, and rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Field Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="e.g., I need a required 'Delivery Instructions' text field and an optional 'Urgency' dropdown with values 'Low', 'Medium', 'High'."
                rows={8}
                required
              />
              {state.errors?.description && (
                <p className="text-sm font-medium text-destructive">
                  {state.errors.description[0]}
                </p>
              )}
            </div>
            <SubmitButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated JSON Schema</CardTitle>
            <CardDescription>
              The AI will generate a JSON schema based on your description. You can copy or refine it as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.message && !state.jsonSchema && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            {state.jsonSchema ? (
               <pre className="p-4 bg-secondary rounded-md overflow-x-auto text-sm">
                <code>{JSON.stringify(JSON.parse(state.jsonSchema), null, 2)}</code>
              </pre>
            ) : (
                <div className="flex items-center justify-center h-48 bg-muted/50 rounded-md">
                    <p className="text-muted-foreground">Schema will appear here...</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
