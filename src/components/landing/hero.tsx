import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';

export function HeroSection() {
  const dashboardImage = PlaceHolderImages.find(img => img.id === 'dashboard-mockup');

  return (
    <section className="relative bg-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-0 w-full h-[500px] bg-gradient-to-br from-primary/10 via-white to-white"></div>
        <div className="absolute -bottom-40 right-0 w-full h-[500px] bg-gradient-to-tl from-accent/5 via-white to-white"></div>
      </div>
      <div className="container mx-auto px-4 md:px-6 pt-24 pb-16 text-center">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
            Made for Indian Businesses 🇮🇳
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 gradient-text">
            Smarter Accounting & GST Filing for Modern Businesses
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Manage GST, Income Tax, invoices, e-way bills, and client accounts — all in one powerful platform.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#demo">Book a Demo</Link>
            </Button>
          </div>
          <div className="mt-10 flex justify-center gap-8 text-sm text-muted-foreground">
            <span>✓ GST Ready</span>
            <span>✓ Secure & Encrypted</span>
            <span>✓ Tally Import</span>
          </div>
          <div className="relative mt-16 w-full max-w-6xl mx-auto">
            {dashboardImage && (
              <Image
                src={dashboardImage.imageUrl}
                alt="CORNER Dashboard Preview"
                width={1200}
                height={800}
                className="rounded-xl border shadow-2xl shadow-primary/10"
                priority
                data-ai-hint={dashboardImage.imageHint}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
