
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-lg text-center shadow-2xl">
                <CardHeader className="items-center">
                    <div className="p-4 bg-destructive/10 rounded-full">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Application Error</CardTitle>
                    <CardDescription>
                        A client-side exception has occurred. This might be temporary.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        We apologize for the inconvenience. Our team has been notified.
                        Please try resetting the application state.
                    </p>
                    {error?.message && (
                        <pre className="mt-2 text-xs text-left p-3 bg-secondary rounded-md overflow-x-auto">
                            <code>Error: {error.message}</code>
                        </pre>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => reset()} className="w-full">
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </body>
    </html>
  );
}
