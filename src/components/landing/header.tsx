"use client";

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#who-its-for', label: 'Who It\'s For' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Testimonials' },
];

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      isScrolled ? "bg-white/80 shadow-md backdrop-blur-sm" : "bg-white"
    )}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <svg
            className="h-7 w-7 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-foreground">CORNER</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-4 py-6">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-4 pt-6">
                  <Button variant="outline" asChild><Link href="/login">Sign In</Link></Button>
                  <Button asChild><Link href="/signup">Start Free Trial</Link></Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
