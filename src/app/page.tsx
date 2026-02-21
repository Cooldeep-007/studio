'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee } from 'lucide-react';
import { useFirebase } from '@/firebase';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isUserLoading: isLoading } = useFirebase();

  useEffect(() => {
    const animationDuration = 3000;
    const startTime = Date.now();

    const performRedirect = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = animationDuration - elapsedTime;

      setTimeout(() => {
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      }, Math.max(0, remainingTime));
    };

    if (!isLoading) {
      performRedirect();
    }
    // This effect will re-run when `isLoading` changes from true to false,
    // at which point `performRedirect` will be called.
  }, [isLoading, user, router]);

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
         <div className="w-full bg-white/20 rounded-full h-1.5">
          <div className="bg-accent h-1.5 rounded-full animate-loading-bar"></div>
        </div>
      </div>

      <footer className="absolute bottom-2 text-center text-xs text-white opacity-50">
        <p>© 2026 Accounting App</p>
      </footer>
    </div>
  );
}
