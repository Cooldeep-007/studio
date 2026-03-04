'use client';

import * as React from 'react';
import Link from 'next/link';
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
import {
  signInWithGoogle,
  signInWithGithub,
  signInWithMicrosoft,
  signInWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  cleanupPhoneAuth,
  AuthError,
} from '@/lib/auth-actions';
import { Loader2, AlertCircle, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginMode = 'main' | 'email' | 'phone-number' | 'phone-otp';

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.108-11.127-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.49,44,30.65,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { toast } = useToast();
  const { user, isLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<LoginMode>('main');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [countdown, setCountdown] = React.useState(0);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    if (!isLoading && user) {
      window.location.href = '/dashboard';
    }
  }, [user, isLoading]);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleError = (error: AuthError) => {
    if (error.code === 'auth/operation-not-allowed') {
      setAuthError(error.message);
    } else {
      setAuthError(null);
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: error.message,
      });
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'microsoft') => {
    setIsSubmitting(true);
    setAuthError(null);
    let error: AuthError | null = null;
    if (provider === 'google') error = await signInWithGoogle();
    else if (provider === 'github') error = await signInWithGithub();
    else if (provider === 'microsoft') error = await signInWithMicrosoft();

    if (error) {
      handleError(error);
      setIsSubmitting(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleEmailSignIn = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setAuthError(null);
    const error = await signInWithEmail(values.email, values.password);
    if (error) {
      handleError(error);
      setIsSubmitting(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleSendOtp = async () => {
    const raw = phoneNumber.trim().replace(/\s+/g, '');
    if (!raw) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a phone number.' });
      return;
    }

    let formattedPhone = raw;
    if (formattedPhone.startsWith('00')) {
      formattedPhone = '+' + formattedPhone.slice(2);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    setIsSubmitting(true);
    setAuthError(null);

    const error = await sendPhoneOtp(formattedPhone, 'recaptcha-container');
    if (error) {
      handleError(error);
      setIsSubmitting(false);
    } else {
      setMode('phone-otp');
      setCountdown(60);
      setIsSubmitting(false);
      toast({ title: 'OTP Sent', description: `Verification code sent to ${formattedPhone}` });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    const error = await verifyPhoneOtp(otp.trim());
    if (error) {
      handleError(error);
      setIsSubmitting(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleResendOtp = () => {
    cleanupPhoneAuth();
    setOtp('');
    setMode('phone-number');
  };

  const goBack = () => {
    setAuthError(null);
    setOtp('');
    if (mode === 'phone-otp' || mode === 'phone-number') {
      cleanupPhoneAuth();
    }
    if (mode === 'phone-otp') {
      setMode('phone-number');
    } else {
      setMode('main');
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex h-[450px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (mode === 'email') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl">Sign In with Email</CardTitle>
              <CardDescription>Enter your email and password.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailSignIn)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Email</Label>
                    <FormControl>
                      <Input id="email" type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link href="#" className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'phone-number') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl">Sign In with Phone</CardTitle>
              <CardDescription>We'll send a verification code to your number.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +91 for India, +1 for US)
              </p>
            </div>
            <Button className="w-full" onClick={handleSendOtp} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Code
            </Button>
          </div>
          <div id="recaptcha-container"></div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'phone-otp') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
            <Button className="w-full" onClick={handleVerifyOtp} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Sign In
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {countdown > 0 ? (
                <span>Resend code in {countdown}s</span>
              ) : (
                <Button variant="link" className="p-0 h-auto text-sm" onClick={handleResendOtp}>
                  Resend verification code
                </Button>
              )}
            </div>
          </div>
          <div id="recaptcha-container"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Choose your preferred sign-in method.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 mb-6">
          <Button variant="outline" className="w-full" onClick={() => handleSocialSignIn('google')} disabled={isSubmitting}>
            <GoogleIcon />
            <span className="ml-2">Continue with Google</span>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleSocialSignIn('github')} disabled={isSubmitting}>
            <GithubIcon />
            <span className="ml-2">Continue with GitHub</span>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleSocialSignIn('microsoft')} disabled={isSubmitting}>
            <MicrosoftIcon />
            <span className="ml-2">Continue with Microsoft</span>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setMode('phone-number')} disabled={isSubmitting}>
            <Phone className="h-[18px] w-[18px]" />
            <span className="ml-2">Continue with Phone</span>
          </Button>
        </div>
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setMode('email')} disabled={isSubmitting}>
          <Mail className="h-[18px] w-[18px]" />
          <span className="ml-2">Sign in with Email & Password</span>
        </Button>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
