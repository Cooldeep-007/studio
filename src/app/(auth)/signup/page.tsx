'use client';

import * as React from 'react';
import { SignupForm } from '@/components/auth/signup-form';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

function SignupSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}


export default function SignupPage() {
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}
