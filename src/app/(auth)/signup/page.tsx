
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { signUpWithEmail, completeGoogleSignup } from '@/lib/auth-actions';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';

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
  name: z.string(), // Will be pre-filled
  companyName: z.string().min(2, 'Company name must be at least 2 characters.'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits.'),
  email: z.string(), // Will be pre-filled
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});


export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
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
    if (isGoogleSignupFlow && user) {
      form.reset({
        name: user.displayName || '',
        email: user.email || '',
      });
    }
  }, [isGoogleSignupFlow, user, form]);
  
  const onSubmit = async (values: z.infer<typeof emailSignupSchema | typeof googleSignupSchema>) => {
    setIsSubmitting(true);
    let error;
    
    if (isGoogleSignupFlow) {
        error = await completeGoogleSignup({
            companyName: values.companyName,
            mobile: values.mobile,
        });
        if (!error) {
            toast({
                title: 'Profile Complete',
                description: 'Welcome! Your account is now fully set up.',
            });
            router.push('/dashboard');
        }
    } else {
        error = await signUpWithEmail(values as z.infer<typeof emailSignupSchema>);
        if (!error) {
            toast({
                title: 'Account Created',
                description: 'You have been successfully signed up.',
            });
            router.push('/dashboard');
        }
    }
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: error.message,
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{isGoogleSignupFlow ? 'Complete Your Profile' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {isGoogleSignupFlow ? 'Just a few more details to get you started.' : 'Enter your information to create an account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="full-name">Full Name</Label>
                  <FormControl>
                    <Input id="full-name" placeholder="Max Robinson" {...field} readOnly={isGoogleSignupFlow} />
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
                    <Input id="email" type="email" placeholder="m@example.com" {...field} readOnly={isGoogleSignupFlow}/>
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
            <Button type="submit" className="w-full" disabled={isSubmitting || isUserLoading}>
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
