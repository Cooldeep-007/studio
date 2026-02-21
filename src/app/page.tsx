'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) {
      // Still loading, do nothing
      return;
    }

    const timer = setTimeout(() => {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }, 2000); // Keep splash for 2 seconds before redirect

    return () => clearTimeout(timer);
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-white bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] relative overflow-hidden">
      <main className="flex flex-col items-center justify-center text-center animate-fade-in-scale">
        <div className="mb-6">
          <IndianRupee className="h-16 w-16 md:h-20 md:w-20" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-widest uppercase">
          ACCOUNTING
        </h1>
        <p className="text-sm md:text-base font-light opacity-80 mt-2">
          Smart GST & Tax Management
        </p>
      </main>

      <div className="absolute bottom-20 left-4 right-4 md:left-20 md:right-20">
         <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
         </div>
      </div>

      <footer className="absolute bottom-2 text-center text-xs text-white opacity-50">
        <p>© 2026 Accounting App</p>
      </footer>
    </div>
  );
}
