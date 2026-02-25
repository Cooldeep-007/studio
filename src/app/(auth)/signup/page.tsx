'use client';

import * as React from 'react';
import Link from 'next/link';
import { redirect, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { signUpWithEmail, completeGoogleSignup, type AuthError } from '@/lib/auth-actions';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Schema for the full email signup
const emailSignupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters.'),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Schema for completing Google signup
const googleSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters.'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});


export default function SignupPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, profile, isLoading: isAuthLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<AuthError | null>(null);
  
  const flow = searchParams.get('flow');
  const isGoogleSignupFlow = flow === 'g-register';

  const form = useForm({
    resolver: zodResolver(isGoogleSignupFlow ? googleSignupSchema : emailSignupSchema),
    defaultValues: {
      name: '',
      companyName: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    // This effect pre-fills the form for the Google Sign-up flow.
    // It uses setValue to avoid resetting the entire form and losing user input on re-renders.
    if (isGoogleSignupFlow && user) {
      if (user.displayName && !form.getValues('name')) {
        form.setValue('name', user.displayName, { shouldValidate: true });
      }
      if (user.email && !form.getValues('email')) {
        form.setValue('email', user.email, { shouldValidate: true });
      }
    }
  }, [isGoogleSignupFlow, user, form]);
  
  const onSubmit = async (values: z.infer<typeof emailSignupSchema | typeof googleSignupSchema>) => {
    setIsSubmitting(true);
    setAuthError(null);
    let error;
    
    if (isGoogleSignupFlow) {
        error = await completeGoogleSignup({
            companyName: values.companyName,
            mobile: values.mobile,
            name: values.name,
            email: values.email,
        });
        if (!error) {
            toast({
                title: 'Profile Complete',
                description: 'Welcome! Your account is now fully set up.',
            });
            // After successful completion, redirect to dashboard.
            redirect('/dashboard');
        }
    } else {
        error = await signUpWithEmail(values as z.infer<typeof emailSignupSchema>);
        if (!error) {
            toast({
                title: 'Account Created',
                description: 'You have been successfully signed up.',
            });
            // After successful signup, redirect to dashboard.
            redirect('/dashboard');
        }
    }
    
    if (error) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError(error);
      } else if (error.code === 'auth/profile-exists') {
        toast({
          title: 'Profile Found',
          description: 'Your profile already exists. Redirecting you to the dashboard.',
        });
        redirect('/dashboard');
      }
      else {
        toast({
          variant: 'destructive',
          title: 'An Error Occurred',
          description: error.message,
        });
      }
    }
    setIsSubmitting(false);
  };

  if (isAuthLoading) {
    return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
    );
  }

  // --- NEW REDIRECTION LOGIC ---
  if (!isAuthLoading && user && profile) {
    // A fully signed-in user with a profile should not be on this page.
    redirect('/dashboard');
  }

  // A logged-in Google user without a profile should be on the g-register flow.
  // If they somehow land on the regular signup, redirect them.
  if (!isAuthLoading && user && !profile && !isGoogleSignupFlow) {
    redirect('/signup?flow=g-register');
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{isGoogleSignupFlow ? 'Complete Your Profile' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {isGoogleSignupFlow ? 'Just a few more details to get you started.' : 'Enter your information to create an account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError && authError.code === 'auth/email-already-in-use' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Already Exists</AlertTitle>
            <AlertDescription>
              An account with this email already exists.
              <Button asChild variant="link" className="p-0 h-auto ml-1 font-semibold">
                <Link href="/login">Log in instead.</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="full-name">Full Name</Label>
                  <FormControl>
                    <Input id="full-name" placeholder="Max Robinson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="companyName">Company Name</Label>
                  <FormControl>
                    <Input id="companyName" placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <FormControl>
                    <Input id="mobile" placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email</Label>
                  <FormControl>
                    <Input id="email" type="email" placeholder="m@example.com" {...field} disabled={isGoogleSignupFlow} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isGoogleSignupFlow && (
                <>
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <Label htmlFor="password">Password</Label>
                        <FormControl>
                            <Input id="password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <FormControl>
                            <Input id="confirmPassword" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || isAuthLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGoogleSignupFlow ? 'Complete Registration' : 'Create an account'}
            </Button>
          </form>
        </Form>
        {!isGoogleSignupFlow && (
            <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
                Sign in
            </Link>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
