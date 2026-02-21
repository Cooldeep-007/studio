'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

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

      <div className="absolute bottom-10 left-4 right-4 md:left-20 md:right-20">
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
             <div className="h-full rounded-full bg-[#10B981] animate-loading-bar"></div>
        </div>
      </div>

      <footer className="absolute bottom-2 text-center text-xs text-white opacity-50">
        <p>© 2026 Accounting App</p>
      </footer>
    </div>
  );
}
